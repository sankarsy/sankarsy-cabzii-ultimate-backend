"use strict";

function inr(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "";
  return `Rs. ${v.toLocaleString("en-IN")}`;
}

function formatQuoteLines(q = {}) {
  const fare = inr(q.estimatedFare);
  const distance = q.distanceKm ? `${q.distanceKm} km` : "";
  return [
    q.quoteRef ? `Quote ref: ${q.quoteRef}` : "",
    q.vehicleName || q.vehicleType ? `Vehicle: ${q.vehicleName || q.vehicleType}` : "",
    q.tripType || q.productType ? `Service: ${q.tripType || q.productType}` : "",
    q.packageLabel ? `Package: ${q.packageLabel}` : "",
    q.pickup || q.boardingPoint ? `Pickup: ${q.pickup || q.boardingPoint}` : "",
    q.drop || q.droppingPoint ? `Drop: ${q.drop || q.droppingPoint}` : "",
    q.travelDate ? `Travel date: ${q.travelDate}` : "",
    q.pickupTime ? `Pickup time: ${q.pickupTime}` : "",
    distance ? `Distance: ${distance}` : "",
    q.passengerCount ? `Passengers: ${q.passengerCount}` : "",
    fare ? `Quoted fare: ${fare}` : "",
    q.mobile ? `WhatsApp / mobile: +91 ${q.mobile}` : ""
  ].filter(Boolean);
}

function buildQuoteText(q = {}, { viewUrl = "", pdfUrl = "" } = {}) {
  const lines = [
    "Cabzii package quote",
    "",
    ...formatQuoteLines(q),
    "",
    "--- Package details (text) ---",
    "This is a trip package quote, not a confirmed booking.",
    "Reply on WhatsApp to confirm or change dates, cab or pickup.",
    viewUrl ? `View quote: ${viewUrl}` : "",
    pdfUrl ? `PDF copy: ${pdfUrl}` : "",
    "",
    "Cabzii.in · Book. Ride. Explore."
  ].filter((line, i, arr) => line !== "" || arr[i - 1] !== "");
  return lines.join("\n");
}

function publicQuotePayload(lead) {
  return {
    quoteRef: lead.quoteRef,
    vehicleName: lead.vehicleName || lead.vehicleType || "",
    vehicleType: lead.vehicleType || "",
    productType: lead.productType || "cab",
    tripType: lead.tripType || "",
    packageLabel: lead.packageLabel || "",
    pickup: lead.boardingPoint || "",
    drop: lead.droppingPoint || "",
    travelDate: lead.travelDate || "",
    pickupTime: lead.pickupTime || "",
    distanceKm: lead.distanceKm || 0,
    passengerCount: lead.passengerCount || "",
    estimatedFare: lead.estimatedFare || 0,
    mobile: lead.mobile || ""
  };
}

module.exports = { formatQuoteLines, buildQuoteText, publicQuotePayload, inr };
