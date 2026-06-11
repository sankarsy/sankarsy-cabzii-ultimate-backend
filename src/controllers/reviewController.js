const Joi = require("joi");
const mongoose = require("mongoose");
const { Review } = require("../models/Review");
const { Booking } = require("../models/Booking");
const { Cab } = require("../models/Cab");
const { Driver } = require("../models/Driver");
const { HttpError } = require("../utils/httpError");
const { parseListQuery, paginatedFind } = require("../utils/listQuery");
const { logAudit } = require("../services/auditService");

const ADMIN_ROLES = ["super_admin", "vendor_admin"];

const submitSchema = Joi.object({
  bookingId: Joi.string().required(),
  phone: Joi.string().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  text: Joi.string().allow("").max(2000).default("")
});

function normalizeDigits(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function describeService(booking) {
  const trip = booking.serviceTripType || booking.tripType || booking.routeType || "";
  const tripLabel =
    { outstation: "Outstation trip", airport: "Airport transfer", hourly: "Hourly rental", local: "Local trip" }[trip] ||
    (booking.type === "driver" ? "Acting driver" : "Cab trip");
  const route = booking.pickup && booking.drop ? ` — ${booking.pickup} → ${booking.drop}` : "";
  return `${tripLabel}${route}`.slice(0, 200);
}

/** Recompute approved-review aggregates and persist them on the Cab/Driver document. */
async function recalcItemAggregates(itemType, itemId) {
  const [agg] = await Review.aggregate([
    { $match: { itemType, itemId: new mongoose.Types.ObjectId(String(itemId)), status: "approved" } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } }
  ]);
  const count = agg?.count || 0;
  const average = count ? Math.round(agg.average * 10) / 10 : 0;
  if (itemType === "cab") {
    await Cab.findByIdAndUpdate(itemId, { rating: average, reviewCount: count });
  } else {
    /* Driver.rating is stored as a string ("4.8") */
    await Driver.findByIdAndUpdate(itemId, { rating: average.toFixed(1), reviewCount: count });
  }
}

/** Public: submit a review for a finished booking. Phone must match the booking. */
async function submitReview(req, res) {
  const { error, value } = submitSchema.validate(req.body, { stripUnknown: true, convert: true });
  if (error) throw new HttpError(400, error.message);
  if (!mongoose.isValidObjectId(value.bookingId)) throw new HttpError(400, "Invalid booking id");

  const booking = await Booking.findById(value.bookingId);
  if (!booking) throw new HttpError(404, "Booking not found");
  if (booking.status !== "finished") throw new HttpError(400, "You can review only after your trip is completed");
  if (!["cab", "driver"].includes(booking.type)) throw new HttpError(400, "This booking type cannot be reviewed");
  if (normalizeDigits(booking.phone) !== normalizeDigits(value.phone)) {
    throw new HttpError(403, "Phone number does not match this booking");
  }

  const existing = await Review.findOne({ booking: booking._id });
  if (existing) throw new HttpError(409, "A review for this booking already exists");

  const data = await Review.create({
    booking: booking._id,
    itemType: booking.type,
    itemId: booking.itemId,
    customerName: booking.customerName,
    phone: booking.phone,
    bookingDate: booking.date || (booking.finishedAt || booking.createdAt).toISOString().slice(0, 10),
    serviceUsed: describeService(booking),
    rating: value.rating,
    text: value.text
  });
  res.status(201).json({ success: true, data, message: "Thanks! Your review will appear after verification." });
}

/** Public: approved reviews for an item (admins may list all with status filter). */
async function listReviews(req, res) {
  const pq = parseListQuery(req);
  const isAdmin = req.user && ADMIN_ROLES.includes(req.user.role);
  const filter = {};
  if (req.query.itemType) filter.itemType = String(req.query.itemType);
  if (req.query.itemId && mongoose.isValidObjectId(req.query.itemId)) {
    filter.itemId = new mongoose.Types.ObjectId(String(req.query.itemId));
  }
  if (isAdmin && req.query.admin === "1") {
    if (req.query.status) filter.status = String(req.query.status);
  } else {
    filter.status = "approved";
  }
  const { data, meta } = await paginatedFind(Review, filter, pq, { createdAt: -1 });
  res.json({ success: true, data, meta });
}

/** Public: rating summary (average, total, distribution) of approved reviews for an item. */
async function getReviewSummary(req, res) {
  const { itemType, itemId } = req.query;
  if (!["cab", "driver"].includes(itemType) || !mongoose.isValidObjectId(itemId)) {
    throw new HttpError(400, "itemType and itemId are required");
  }
  const rows = await Review.aggregate([
    { $match: { itemType, itemId: new mongoose.Types.ObjectId(String(itemId)), status: "approved" } },
    { $group: { _id: "$rating", count: { $sum: 1 } } }
  ]);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;
  for (const row of rows) {
    distribution[row._id] = row.count;
    total += row.count;
    sum += row._id * row.count;
  }
  res.json({
    success: true,
    data: { average: total ? Math.round((sum / total) * 10) / 10 : 0, total, distribution }
  });
}

/** Public: review status for a specific booking (used by My Bookings UI). */
async function getReviewForBooking(req, res) {
  const { bookingId, phone } = req.query;
  if (!mongoose.isValidObjectId(bookingId)) throw new HttpError(400, "Invalid booking id");
  const review = await Review.findOne({ booking: bookingId });
  if (review && normalizeDigits(review.phone) !== normalizeDigits(phone)) {
    throw new HttpError(403, "Phone number does not match this booking");
  }
  res.json({ success: true, data: review || null });
}

/** Admin: approve / reject — recalculates item aggregates immediately. */
async function updateReviewStatus(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const status = String(req.body.status || "");
  if (!["pending", "approved", "rejected"].includes(status)) throw new HttpError(400, "Invalid status");
  const data = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!data) throw new HttpError(404, "Review not found");
  await recalcItemAggregates(data.itemType, data.itemId);
  await logAudit({ req, action: "update", entity: "review", entityId: data._id, after: data.toObject() });
  res.json({ success: true, data });
}

async function deleteReview(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, "Invalid id");
  const data = await Review.findByIdAndDelete(req.params.id);
  if (!data) throw new HttpError(404, "Review not found");
  await recalcItemAggregates(data.itemType, data.itemId);
  await logAudit({ req, action: "delete", entity: "review", entityId: data._id, before: data.toObject() });
  res.json({ success: true, message: "Review deleted" });
}

module.exports = {
  submitReview,
  listReviews,
  getReviewSummary,
  getReviewForBooking,
  updateReviewStatus,
  deleteReview
};
