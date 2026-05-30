require("dotenv").config();
const mongoose = require("mongoose");
const { City } = require("../src/models/City");

const TAMIL_NADU_CITIES = [
  "Chennai",
  "Coimbatore",
  "Madurai",
  "Tiruchirappalli",
  "Salem",
  "Tirunelveli",
  "Tiruppur",
  "Erode",
  "Vellore",
  "Thoothukudi",
  "Dindigul",
  "Thanjavur",
  "Ranipet",
  "Sivakasi",
  "Karur",
  "Udhagamandalam",
  "Hosur",
  "Nagercoil",
  "Kanchipuram",
  "Kumbakonam",
  "Cuddalore",
  "Tiruvannamalai",
  "Pollachi",
  "Nagapattinam",
  "Krishnagiri",
  "Dharmapuri",
  "Namakkal",
  "Virudhunagar",
  "Ramanathapuram",
  "Theni",
  "Chengalpattu",
  "Villupuram",
  "Tirupati"
];

const OTHER_CITIES = [
  { name: "Bengaluru", state: "Karnataka", sortOrder: 1 },
  { name: "Mumbai", state: "Maharashtra", sortOrder: 2 },
  { name: "Hyderabad", state: "Telangana", sortOrder: 3 }
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  await mongoose.connect(uri);

  let order = 0;
  for (const name of TAMIL_NADU_CITIES) {
    order += 1;
    await City.findOneAndUpdate(
      { name, state: "Tamil Nadu" },
      { $set: { name, state: "Tamil Nadu", sortOrder: order, isActive: true } },
      { upsert: true, new: true }
    );
  }

  for (const city of OTHER_CITIES) {
    await City.findOneAndUpdate(
      { name: city.name, state: city.state },
      { $set: { ...city, isActive: true } },
      { upsert: true, new: true }
    );
  }

  console.log(`Seeded ${TAMIL_NADU_CITIES.length} Tamil Nadu cities + ${OTHER_CITIES.length} other cities.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
