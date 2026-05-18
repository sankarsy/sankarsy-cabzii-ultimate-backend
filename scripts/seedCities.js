require("dotenv").config();
const mongoose = require("mongoose");
const { City } = require("../src/models/City");
const { Location } = require("../src/models/Location");

const CITIES = [
  { name: "Bengaluru", state: "Karnataka", sortOrder: 1 },
  { name: "Mumbai", state: "Maharashtra", sortOrder: 2 },
  { name: "Delhi", state: "Delhi", sortOrder: 3 },
  { name: "Chennai", state: "Tamil Nadu", sortOrder: 4 },
  { name: "Hyderabad", state: "Telangana", sortOrder: 5 },
  { name: "Pune", state: "Maharashtra", sortOrder: 6 },
  { name: "Kolkata", state: "West Bengal", sortOrder: 7 },
  { name: "Jaipur", state: "Rajasthan", sortOrder: 8 }
];

const SAMPLE_LOCATIONS = [
  { cityName: "Bengaluru", name: "MG Road", address: "MG Road, Bengaluru" },
  { cityName: "Bengaluru", name: "Kempegowda Airport T1", address: "KIAL Road, Devanahalli" },
  { cityName: "Mumbai", name: "Andheri East", address: "Andheri East, Mumbai" },
  { cityName: "Mumbai", name: "CSMIA Terminal 2", address: "Sahar, Andheri East" },
  { cityName: "Delhi", name: "Connaught Place", address: "Connaught Place, New Delhi" },
  { cityName: "Delhi", name: "IGI Airport T3", address: "Indira Gandhi International Airport" }
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  await mongoose.connect(uri);

  for (const city of CITIES) {
    await City.findOneAndUpdate({ name: city.name, state: city.state }, { $set: city }, { upsert: true, new: true });
  }

  const cityMap = {};
  const allCities = await City.find().lean();
  allCities.forEach((c) => {
    cityMap[c.name] = c;
  });

  for (const loc of SAMPLE_LOCATIONS) {
    const city = cityMap[loc.cityName.split(",")[0]] || allCities.find((c) => c.name === loc.cityName);
    if (!city) continue;
    const cityName = city.state ? `${city.name}, ${city.state}` : city.name;
    await Location.findOneAndUpdate(
      { city: city._id, name: loc.name },
      {
        $set: {
          city: city._id,
          cityName,
          name: loc.name,
          address: loc.address,
          isActive: true
        }
      },
      { upsert: true, new: true }
    );
  }

  console.log("Cities and sample locations seeded.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
