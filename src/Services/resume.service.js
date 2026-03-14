import Resume from "../Model/Resume.js";
import { bucket } from "../utils/gcs.js";

// create resume
export const createResume = async (data) => {
  // Determine version for the same user & same title
  const lastResume = await Resume.findOne({
    user: data.user,
    title: data.title
  })
    .sort({ version: -1 })
    .select("version")
    .lean();

  const lastVersion = Number(lastResume?.version || 0);
  const version = lastVersion + 1;

  const resumeDoc = await Resume.create({ ...data, version });
  return resumeDoc;
};

// list resumes for a user
export const getResumes = async (userId, page = 1, limit = 6) => {
  if (!userId) throw new Error("User ID missing");

  const skip = (page - 1) * limit;

  const [resumes, total] = await Promise.all([
    Resume.find({
      user: userId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Resume.countDocuments({
      user: userId,
      isDeleted: false,
    }),
  ]);

  const formatted = resumes.map((r) => ({
    ...r,
    title: `${r.title} (v${r.version})`,
    previewUrl: `/api/resume/view/${r._id}`,
    downloadUrl: `/api/resume/download/${r._id}`,
  }));

  return {
    data: formatted,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const deleteResume = async (resumeId, userId) => {
  if (!resumeId || !userId) {
    throw new Error("Resume ID & User ID are required");
  }

  const resume = await Resume.findOne({
    _id: resumeId,
    user: userId,
    isDeleted: false
  });

  if (!resume) {
    throw new Error("Resume not found or already deleted");
  }

  console.log("🗑 Soft deleting resume:", resume._id);

  resume.isDeleted = true;
  resume.deletedAt = new Date();
  resume.isDefault = false;

  await resume.save();

  // ensure user still has a default resume
  const anotherResume = await Resume.findOne({
    user: userId,
    isDeleted: false
  }).sort({ createdAt: -1 });

  if (anotherResume) {
    anotherResume.isDefault = true;
    await anotherResume.save();
  }

  console.log("✅ Resume soft deleted");

  return { message: "Resume deleted successfully" };
};