const JobStatusName = require("../models/jobstatusModel");

const generateJobStatusId = async () => {
  const jobstatus = await JobStatusName.find(
    {},
    { jobstatusId: 1, _id: 0 }
  ).sort({
    jobstatusId: 1,
  });
  const jobstatusIds = jobstatus.map((jobstatus) =>
    parseInt(jobstatus.jobstatusId.replace("jobstatusId", ""), 10)
  );

  let jobstatusId = 1;
  for (let i = 0; i < jobstatusIds.length; i++) {
    if (jobstatusId < jobstatusIds[i]) {
      break;
    }
    jobstatusId++;
  }

  return `jobstatusId${String(jobstatusId).padStart(4, "0")}`;
};

exports.createJobstatus = async (req, res) => {
  try {
    const { jobstatusName } = req.body;

    const jobstatusId = await generateJobStatusId();
    const newJobStatus = new JobStatusName({
      jobstatusId,
      jobstatusName,
    });

    await newJobStatus.save();
    res
      .status(201)
      .json({ message: "Job Status created successfully", newJobStatus });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: " Job status already exists. Please try another name.",
      });
    }
    console.error("Error creating Job Status:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getJobstatus = async (req, res) => {
  try {
    const jobstatus = await JobStatusName.find();
    res.status(200).json(jobstatus);
  } catch (error) {
    console.error("Error fetching jobstatus:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateJobstatus = async (req, res) => {
  try {
    const { jobstatusId } = req.params;
    const { jobstatusName, activeState } = req.body;

    const jobstatusUpdate = await JobStatusName.findOne({ jobstatusId });
    if (!jobstatusUpdate) {
      return res.status(404).json({ message: "Jobstatus not found" });
    }

    jobstatusUpdate.jobstatusName =
      jobstatusName || jobstatusUpdate.jobstatusName;
    jobstatusUpdate.activeState = activeState || jobstatusUpdate.activeState;

    await jobstatusUpdate.save();
    res
      .status(200)
      .json({ message: "JobStatus updated successfully", jobstatusUpdate });
  } catch (error) {
    console.error("Error updating Jobstatus:", error.message);
    res.status(500).json({ message: "Error updating Service", error });
  }
};

exports.deleteJobstatus = async (req, res) => {
  try {
    const { jobstatusId } = req.params;

    // Find brand to get public_id
    const jobstatusDelete = await JobStatusName.findOne({ jobstatusId });
    if (!jobstatusDelete) {
      return res.status(404).json({ message: "JobStatus not found" });
    }

    // Delete brand from database
    await JobStatusName.findOneAndDelete({ jobstatusId });
    res.status(200).json({ message: "Job Status deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Job Status", error });
  }
};
