const ServiceType = require("../models/serviceModel");

const generateServiceId = async () => {
  const services = await ServiceType.find({}, { serviceId: 1, _id: 0 }).sort({
    serviceId: 1,
  });
  const serviceIds = services.map((services) =>
    parseInt(services.serviceId.replace("serviceId", ""), 10)
  );

  let serviceId = 1;
  for (let i = 0; i < serviceIds.length; i++) {
    if (serviceId < serviceIds[i]) {
      break;
    }
    serviceId++;
  }

  return `serviceId${String(serviceId).padStart(4, "0")}`;
};

exports.createService = async (req, res) => {
  try {
    const { servicetype } = req.body;

    const serviceId = await generateServiceId();
    const newService = new ServiceType({
      serviceId,
      servicetype,
    });

    await newService.save();
    res
      .status(201)
      .json({ message: "Service created successfully", newService });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Service Type already exists. Please try another name.",
      });
    }
    console.error("Error creating Service:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getService = async (req, res) => {
  try {
    const services = await ServiceType.find();
    res.status(200).json(services);
  } catch (error) {
    console.error("Error fetching Services:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { servicetype, activeState } = req.body;

    const serviceUpdate = await ServiceType.findOne({ serviceId });
    if (!serviceUpdate) {
      return res.status(404).json({ message: "Warranty not found" });
    }

    serviceUpdate.servicetype = servicetype || serviceUpdate.servicetype;
    serviceUpdate.activeState = activeState || serviceUpdate.activeState;

    await serviceUpdate.save();
    res
      .status(200)
      .json({ message: "Service updated successfully", serviceUpdate });
  } catch (error) {
    console.error("Error updating Service:", error.message);
    res.status(500).json({ message: "Error updating Service", error });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    // Find brand to get public_id
    const serviceDelete = await ServiceType.findOne({ serviceId });
    if (!serviceDelete) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Delete brand from database
    await ServiceType.findOneAndDelete({ serviceId });
    res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Service", error });
  }
};
