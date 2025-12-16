const mongoose = require("mongoose");

// Define schemas outside the connection function
// Define Club schema based on the updated schema requirements
const clubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    maxLength: 200,
  },
  description: {
    type: String,
    maxLength: 2000,
  },
  category: {
    type: String,
    required: true,
    enum: [
      "Học thuật",
      "Nghệ thuật",
      "Thể thao",
      "Cộng đồng",
      "Kinh doanh",
      "Công nghệ",
      "Truyền thông",
      "Sở thích",
      "Khác",
    ],
  },
  location: {
    type: String,
    maxLength: 500,
  },
  contact_email: {
    type: String,
    validate: {
      validator: function (v) {
        return !v || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
      },
      message: "Invalid email format",
    },
  },
  contact_phone: {
    type: String,
    maxLength: 20,
  },
  logo_url: {
    type: String,
    maxLength: 500,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: "Logo URL must be a valid HTTP/HTTPS URL",
    },
  },
  cover_url: {
    type: String,
    maxLength: 500,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: "Cover URL must be a valid HTTP/HTTPS URL",
    },
  },
  website_url: {
    type: String,
    maxLength: 500,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: "Website URL must be a valid HTTP/HTTPS URL",
    },
  },
  social_links: {
    type: {
      facebook: {
        type: String,
        maxLength: 500,
        validate: {
          validator: function (v) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: "Facebook URL must be a valid HTTP/HTTPS URL",
        },
      },
      instagram: {
        type: String,
        maxLength: 500,
        validate: {
          validator: function (v) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: "Instagram URL must be a valid HTTP/HTTPS URL",
        },
      },
      twitter: {
        type: String,
        maxLength: 500,
        validate: {
          validator: function (v) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: "Twitter URL must be a valid HTTP/HTTPS URL",
        },
      },
      linkedin: {
        type: String,
        maxLength: 500,
        validate: {
          validator: function (v) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: "LinkedIn URL must be a valid HTTP/HTTPS URL",
        },
      },
    },
    default: {},
    _id: false, // Prevent automatic _id generation
  },
  settings: {
    type: {
      is_public: { type: Boolean, default: true },
      requires_approval: { type: Boolean, default: true },
      max_members: { type: Number, min: 1 },
    },
    default: {
      is_public: true,
      requires_approval: true,
    },
    _id: false, // Prevent automatic _id generation
  },
  // Member count field
  member_count: {
    type: Number,
    default: 1,
    min: 0,
    required: true,
  },
  // Deprecated fields (keeping for backward compatibility)
  type: { type: String }, // Will be migrated to category
  size: { type: Number }, // Will use membership count instead
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: {
    type: String,
    default: "ACTIVE",
    enum: ["ACTIVE", "INACTIVE"],
  },
  created_by: {
    type: String,
    required: true,
  },
  // Manager information (snapshot at creation time)
  manager: {
    type: {
      user_id: {
        type: String,
        required: true,
      },
      full_name: {
        type: String,
        required: true,
        maxLength: 255,
      },
      email: {
        type: String,
        validate: {
          validator: function (v) {
            return (
              !v || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v)
            );
          },
          message: "Invalid email format",
        },
      },
      assigned_at: {
        type: Date,
        default: Date.now,
      },
    },
    required: true,
    _id: false, // Prevent automatic _id generation
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date },
});

// Text index on club name for search functionality
clubSchema.index({ name: "text" });

// Define Membership schema (enhanced to match schema requirements)
const membershipSchema = new mongoose.Schema({
  club_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Club",
  },
  user_id: {
    type: String,
    required: true,
  },
  user_email: {
    type: String,
    required: false,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
      },
      message: "Invalid email format",
    },
  },
  user_full_name: {
    type: String,
    required: false,
    trim: true,
    maxLength: 255,
  },
  campaign_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RecruitmentCampaign",
    default: null,
  },
  role: {
    type: String,
    required: true,
    enum: ["member", "organizer", "club_manager"],
    default: "member",
  },
  status: {
    type: String,
    required: true,
    enum: ["active", "pending", "rejected", "removed"],
    default: "pending",
  },
  application_message: {
    type: String,
    maxLength: 1000,
  },
  application_answers: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  approved_by: {
    type: String, // UUID from Auth Service
  },
  approved_at: {
    type: Date,
  },
  joined_at: {
    type: Date,
    required: true,
    default: Date.now,
  },
  removed_at: {
    type: Date,
  },
  removal_reason: {
    type: String,
    maxLength: 500,
  },
  updated_at: { type: Date, default: Date.now },
});

// Create compound index for user_id and club_id to ensure uniqueness
membershipSchema.index({ club_id: 1, user_id: 1 }, { unique: true });
membershipSchema.index({ club_id: 1, status: 1 });
membershipSchema.index({ user_id: 1, status: 1 });
membershipSchema.index({ campaign_id: 1 });
membershipSchema.index({ joined_at: 1 });

// Define RecruitmentCampaign schema (renamed from RecruitmentRound)
const recruitmentCampaignSchema = new mongoose.Schema({
  club_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Club",
  },
  title: {
    type: String,
    required: true,
    maxLength: 200,
  },
  description: {
    type: String,
    maxLength: 2000,
  },
  requirements: {
    type: [String],
    default: [],
  },
  application_questions: {
    type: [
      {
        id: { type: String, required: true },
        question: { type: String, required: true, maxLength: 500 },
        type: {
          type: String,
          required: true,
          enum: ["text", "textarea", "select", "checkbox"],
        },
        required: { type: Boolean, default: false },
        max_length: { type: Number },
        options: [{ type: String }],
      },
    ],
    default: [],
  },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  max_applications: {
    type: Number,
    min: 1,
  },
  status: {
    type: String,
    required: true,
    enum: ["draft", "published", "paused", "completed"],
    default: "draft",
  },
  statistics: {
    type: {
      total_applications: { type: Number, min: 0, default: 0 },
      approved_applications: { type: Number, min: 0, default: 0 },
      rejected_applications: { type: Number, min: 0, default: 0 },
      pending_applications: { type: Number, min: 0, default: 0 },
      last_updated: { type: Date, default: Date.now },
    },
    default: {
      total_applications: 0,
      approved_applications: 0,
      rejected_applications: 0,
      pending_applications: 0,
      last_updated: new Date(),
    },
    _id: false, // Prevent automatic _id generation
  },
  // Backward compatibility fields
  criteria: { type: String }, // Deprecated, use requirements instead
  review_criteria: { type: mongoose.Schema.Types.Mixed, default: {} }, // Deprecated
  quota: { type: Number }, // Deprecated, use max_applications instead
  start_at: { type: Date }, // Deprecated, use start_date instead
  end_at: { type: Date }, // Deprecated, use end_date instead
  created_by: {
    type: String,
    required: true,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Instance Methods for RecruitmentCampaign
recruitmentCampaignSchema.methods.toPublicJSON = function () {
  const clubName = this.club_id?.name || null;
  const clubId = this.club_id?._id || this.club_id;

  return {
    id: this._id,
    club_id: clubId,
    club_name: clubName,
    title: this.title,
    description: this.description,
    requirements: this.requirements,
    application_questions: this.application_questions,
    start_date: this.start_date,
    end_date: this.end_date,
    max_applications: this.max_applications,
    status: this.status,
    statistics: this.statistics,
    created_at: this.created_at,
    updated_at: this.updated_at,
  };
};

recruitmentCampaignSchema.methods.toManagerJSON = function () {
  return {
    id: this._id,
    club_id: this.club_id,
    title: this.title,
    description: this.description,
    requirements: this.requirements,
    application_questions: this.application_questions,
    start_date: this.start_date,
    end_date: this.end_date,
    max_applications: this.max_applications,
    status: this.status,
    statistics: this.statistics,
    created_by: this.created_by,
    created_at: this.created_at,
    updated_at: this.updated_at,
  };
};

recruitmentCampaignSchema.index({ club_id: 1, status: 1 });
recruitmentCampaignSchema.index({ start_date: 1, end_date: 1 });
recruitmentCampaignSchema.index({ created_by: 1 });

// Create models
const Club = mongoose.model("Club", clubSchema);
const Membership = mongoose.model("Membership", membershipSchema);
const RecruitmentCampaign = mongoose.model(
  "RecruitmentCampaign",
  recruitmentCampaignSchema
);

// Backward compatibility alias
const RecruitmentRound = RecruitmentCampaign;

const connectToDatabase = async () => {
  try {
    const config = require("./index");
    // Use MongoDB connection string from centralized config
    const MONGO_URI = config.get("MONGODB_URI");

    if (
      !MONGO_URI &&
      (process.env.NODE_ENV === "development" || process.env.MOCK_DB === "true")
    ) {
      console.warn(
        "⚠️ Running in development mode without database connection (Mock Mode)"
      );
      return false;
    }

    // Add connection options for MongoDB Atlas
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    console.log("✅ Connected to MongoDB Atlas - Club Service Database");
    // Mask password in logs
    console.log(
      "🔗 Database:",
      MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")
    );
    console.log("📊 MongoDB schemas initialized");
    return true;
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
    if (process.env.NODE_ENV === "development") return false;
    throw error;
  }
};

module.exports = {
  connectToDatabase,
  Club,
  Membership,
  RecruitmentCampaign,
  RecruitmentRound, // Backward compatibility
};
