const User = require("../models/user");
const Staff = require("../models/staff");
const Service = require("../models/service");
const Booking = require("../models/booking");
const StaffService = require("../models/staffServices");
const Review = require("../models/review");
const sequelize = require("../utilities/sql");
const { Op } = require("sequelize"); 
const createService = async (req, res) => {
  try {
    const { name, description, duration, price } = req.body;

    // --- START VALIDATION ---
    if (!name || !duration || !price) {
      return res.status(400).json({
        message: "Validation error: Name, duration, and price are required.",
      });
    }

    if (isNaN(parseInt(duration)) || parseInt(duration) <= 0) {
      return res.status(400).json({
        message: "Validation error: Duration must be a positive number (in minutes).",
      });
    }

    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return res.status(400).json({
        message: "Validation error: Price must be a valid number.",
      });
    }
    // --- END VALIDATION ---

    const newService = await Service.create({
      name,
      description,
      duration,
      price,
    });

    res.status(201).json({
      message: "Service created successfully",
      service: newService,
    });
  } catch (error) {
    // This will now mostly catch real database/server errors
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const getAllServices = async (req, res) => {
  try {
    const allServices = await Service.findAll({
      where: { available: true },
      include: {
        model: Staff,
        as: "Staffs",
        attributes: ["id"],
        through: { attributes: [] }
      }
    });

    res.status(200).json({ services: allServices });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const getServicebyId = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service)
      res.status(404).json({
        message: "Service not found",
      });
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const updateService = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Only get the details for the service itself
    const { name, description, duration, price } = req.body;

    // Use this logic to update fields ONLY if they were sent.
    // This correctly handles sending an empty string "" or a price of 0.
    if (name !== undefined) service.name = name;
    if (description !== undefined) service.description = description;
    if (duration !== undefined) service.duration = parseInt(duration);
    if (price !== undefined) service.price = parseFloat(price);

    await service.save();
    
    res.status(200).json({
      message: "Service updated successfully",
      service
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

const updateServiceAvailability = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Only get the 'available' field
    const { available } = req.body;

    // Validation: Check if 'available' is a boolean
    if (typeof available !== 'boolean') {
      return res.status(400).json({ 
        message: "Validation error: 'available' field must be true or false." 
      });
    }

    service.available = available;
    await service.save();

    res.status(200).json({ 
      message: "Service availability updated", 
      service 
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

const deleteService = async (req,res) => {
    try {
        const service = await Service.findByPk(req.params.id);
        if(!service) res.status(404).json({
            message:'Service is not available'
        });
        await service.destroy();
        res.status(200).json({
            message:"Service deleted successfully"
        });
    } catch (error) {
        res.status(500).json({message:"Server error",error:error.message})
    }
};
/**
 * @desc    Get all reviews for a specific service
 * @route   GET /services/:id/reviews
 * @access  Public
 */
const getReviewsForService = async (req, res) => {
  try {
    const { id } = req.params;

    // First, check if the service actually exists
    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // If the service exists, find all its reviews
    const reviews = await Review.findAll({
      where: { serviceId: id },
      order: [['createdAt', 'DESC']], // Show newest reviews first
      include: [
        {
          // Include the user who wrote the review
          model: User,
          // Only show their name for privacy and security
          attributes: ['id', 'name'],
        },
      ],
    });

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Get Reviews For Service Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
/**
 * @desc    Get all staff members who can perform a specific service
 * @route   GET /services/:id/staff
 * @access  Public
 */
const getStaffForService = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the service and include all associated staff members
    const service = await Service.findByPk(id, {
      include: [{
        model: Staff,
        // For each staff member, also include their user details (name, etc.)
        include: [{
          model: User,
          attributes: ['id', 'name', 'email']
        }],
        // This hides the data from the intermediate 'StaffService' join table
        through: { attributes: [] }
      }]
    });

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Respond with just the array of staff members
    res.status(200).json(service.Staffs);
  } catch (error) {
    console.error("Get Staff For Service Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports ={
    createService,
    getAllServices,
    getServicebyId,
    updateService,
    updateServiceAvailability,
    deleteService,
    getReviewsForService,
    getStaffForService
}