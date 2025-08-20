const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const MongoDbConnect = require("./connection");
require("dotenv").config();
const dotenv = require("dotenv");
const fileUpload = require("express-fileupload");
const admin = require("firebase-admin");
const path = require("path");

const port = 8800;
MongoDbConnect();
dotenv.config();

const userRoutes = require("./routes/userRoutes");
const teamleaderRoutes = require("./routes/teamleaderRoute");
const brandRoutes = require("./routes/brandRoutes");
const productRoutes = require("./routes/productRoutes");
const engineerRoutes = require("./routes/engineerRoutes");
const warrantyRoutes = require("./routes/warrantyRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const jobstatusRoutes = require("./routes/jobstatusRoutes");
const calldetailsRoutes = require("./routes/calldetailsRoutes");
const notificationRoutes = require("./routes/notificationRoute");
const customerRoutes = require("./routes/customerRoutes");
const callRequestRoutes = require("./routes/callRequestRoutes");

require("./controllers/updateTATCron");

try {
  const serviceAccount = require(path.resolve(
    __dirname,
    "./pdenterprise-engineer-firebase-adminsdk.json"
  ));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // You might need to specify databaseURL if you're using Realtime Database or Firestore
    // databaseURL: "https://<YOUR_PROJECT_ID>.firebaseio.com"
  });
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error.message);
  console.error(
    "Please ensure your service account key path is correct and the file exists."
  );
  process.exit(1); // Exit if Firebase fails to initialize, as notifications won't work
}

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json());
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    limits: { fileSize: 50 * 1024 * 1024 },
  })
);

app.use("/api", userRoutes);
app.use("/api", teamleaderRoutes);

app.use("/api/brandsadd", brandRoutes);
app.use("/api/productsadd", productRoutes);
app.use("/api/enginnerdetails", engineerRoutes);
app.use("/api/warrantytype", warrantyRoutes);
app.use("/api/servicetype", serviceRoutes);
app.use("/api/jobstatus", jobstatusRoutes);
app.use("/api/calldetails", calldetailsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/callrequests", callRequestRoutes);

app.listen(port, () => {
  console.log(`Port starts on  ${port}`);
});
