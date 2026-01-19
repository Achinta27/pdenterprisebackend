const mongoose = require("mongoose");

const additionalCallSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      unique: true,
      required: true,
    },
    requested_date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Completed", "Canceled"],
    },
    service_type: {
      type: String,
      required: true,
      default: "salon_services",
      enum: [
        "electronics_parts",
        "salon_services",
        "sanitary_services",
        "cleaning_services",
        "grocery_services",
      ],
    },
    additional_service_type: {
      type: String,
      required: true,
      default: "salon_services",
      enum: [
        "haircut_spa_and_wash_head_massage",
        "hair_smoothening_straightening",
        "hair_coloring_and_root_touch_up",
        "keratin_and_protein_hair_treatment",
        "facial_cleanup_and_de_tan_facial",
        "full_arms_and_full_legs_waxing",
        "eyebrow_threading_and_upper_lip",
        "manicure_and_pedicure",
        "party_makeup_and_occasion_makeup",
        "bathroom_and_toilet_deep_cleaning",
        "residential_house_cleaning",
        "septic_tank_cleaning_and_desludging",
        "drain_and_sewer_line_cleaning",
        "water_tank_cleaning",
        "garbage_collection_and_waste_disposal",
        "pest_control_and_disinfection_service",
        "office_and_commercial_space_cleaning",
        "public_toilet_maintenance_and_sanitization",
        "home_deep_cleaning_service",
        "living_room_and_bedroom_cleaning",
        "kitchen_degreasing_and_sanitizing",
        "window_and_glass_cleaning_service",
        "marble_and_granite_floor_polishing",
        "curtain_and_blind_cleaning",
        "sofa_cleaning_and_shampooing_service",
        "balcony_and_terrace_cleaning",
        "spring_and_festival_home_cleaning",
      ],
    },
    visit_date: {
      type: Date,
    },
    total_amount: {
      type: Number,
    },
    profit_amount: {
      type: Number,
    },
    commission_amount: {
      type: Number,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Customer",
    },
    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.additionalCall ||
  mongoose.model("additionalCall", additionalCallSchema);
