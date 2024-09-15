import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { fileURLToPath } from "url";

dotenv.config();

// Resolve __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const app = express();

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + uuidv4() + path.extname(file.originalname));
  },
});

// File validation (only video files)
const fileFilter = (req, file, cb) => {
  const filetypes = /mp4|mov|avi|mkv/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only video files are allowed!"));
  }
};
// CORS Configuration
app.use(cors({ origin: process.env.ORIGIN_ALLOWED }));

const upload = multer({ storage: storage, fileFilter });

// Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static files from "uploads" and ensure correct MIME types for HLS files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  "/uploads/v",
  express.static(path.join(__dirname, "uploads/v"), {
    setHeaders: function (res, filePath) {
      res.setHeader("Access-Control-Allow-Origin", process.env.ORIGIN_ALLOWED.toString());
      if (filePath.endsWith(".m3u8")) {
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      } else if (filePath.endsWith(".ts")) {
        res.setHeader("Content-Type", "video/MP2T");
      }
    },
  })
);

// Test Route
app.get("/", (req, res) => {
  res.json({ message: "Server is running..." });
});

// Helper function to convert video to HLS format using FFmpeg (Promise-based)
const convertToHLS = (inputVideoPath, outputDirectory) => {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i ${inputVideoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputDirectory}/segment%03d.ts" -start_number 0 ${outputDirectory}/index.m3u8`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Error during conversion:", error);
        return reject(error);
      }
      console.log(`FFmpeg stdout: ${stdout}`);
      console.log(`FFmpeg stderr: ${stderr}`);
      resolve();
    });
  });
};

// Upload Route
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const id = uuidv4();
    const v_path = req.file.path;
    const f_path = `./uploads/v/${id}`;
    const hls_path = `${f_path}/index.m3u8`;

    console.log("HLS PATH:", hls_path);

    // Create the directory for HLS segments if it doesn't exist
    if (!fs.existsSync(f_path)) {
      fs.mkdirSync(f_path, { recursive: true });
    }

    // Convert video to HLS
    try {
      await convertToHLS(v_path, f_path);
    } catch (error) {
      console.log(error)
    }

    // Respond with the video URL
    const v_url = `http://localhost:${PORT}/uploads/v/${id}/index.m3u8`;
    res.json({
      message: "Video successfully converted to HLS",
      video_url: v_url,
      id: id,
    });
  } catch (error) {
    console.error("Error during file upload or HLS conversion:", error);
    res.status(500).json({ error: "Failed to process video", details: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
