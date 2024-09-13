const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const MongoDbConnect = require("./connection");
require("dotenv").config();
const dotenv = require("dotenv");
const fileUpload = require("express-fileupload");

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

require("./controllers/updateTATCron");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

app.listen(port, () => {
  console.log(`Port starts on  ${port}`);
});
