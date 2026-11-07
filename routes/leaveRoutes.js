
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const LeaveRequest = require("../models/LeaveRequest");

const router = express.Router();

// =====================================
// STUDENT REGISTRATION
// =====================================

router.post("/register", async (req, res) => {
    try {
        const { username, email, rollNumber } = req.body;

        if (!username || !email || !rollNumber) {
            return res.status(400).json({
                message: "Please fill all required fields."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedRoll = rollNumber.trim();

        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { rollNumber: normalizedRoll }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email or roll number already registered."
            });
        }

        const user = await User.create({
            username: username.trim(),
            email: normalizedEmail,
            rollNumber: normalizedRoll,
            role: "student"
        });

        res.status(201).json({
            message: "Student registered successfully.",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                rollNumber: user.rollNumber,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Student registration error:", error);

        res.status(500).json({
            message: "Student registration failed."
        });
    }
});


// =====================================
// STUDENT LOGIN
// =====================================

router.post("/login", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Please enter your email."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Supports older accounts without a role field
        const user = await User.findOne({
            email: normalizedEmail,
            $or: [
                { role: "student" },
                { role: { $exists: false } },
                { role: null }
            ]
        });

        if (!user) {
            return res.status(404).json({
                message: "Student account not found."
            });
        }

        res.json({
            message: "Login successful.",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                rollNumber: user.rollNumber,
                role: "student"
            }
        });

    } catch (error) {
        console.error("Student login error:", error);

        res.status(500).json({
            message: "Student login failed."
        });
    }
});


// =====================================
// STUDENT LEAVE BALANCE
// =====================================

router.get("/leave-balance/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: "Student not found."
            });
        }

        res.json({
            casualLeave: user.casualLeave,
            medicalLeave: user.medicalLeave
        });

    } catch (error) {
        console.error("Leave balance error:", error);

        res.status(500).json({
            message: "Unable to get leave balance."
        });
    }
});


// =====================================
// APPLY FOR LEAVE
// =====================================

router.post("/apply-leave/:id", async (req, res) => {
    try {
        const { type, days } = req.body;
        const studentId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({
                message: "Invalid student ID."
            });
        }

        const leaveDays = Number(days);

        if (
            !["casual", "medical"].includes(type) ||
            !Number.isInteger(leaveDays) ||
            leaveDays < 1
        ) {
            return res.status(400).json({
                message: "Please enter a valid leave type and number of days."
            });
        }

        const user = await User.findById(studentId);

        if (!user) {
            return res.status(404).json({
                message: "Student not found."
            });
        }

        const availableLeave =
            type === "casual"
                ? user.casualLeave
                : user.medicalLeave;

        if (leaveDays > availableLeave) {
            return res.status(400).json({
                message: "Insufficient leave balance."
            });
        }

        const leaveRequest = await LeaveRequest.create({
            user: user._id,
            type,
            days: leaveDays,
            status: "pending"
        });

        res.status(201).json({
            message: "Leave request submitted successfully.",
            request: leaveRequest
        });

    } catch (error) {
        console.error("Apply leave error:", error);

        res.status(500).json({
            message: "Unable to submit leave request."
        });
    }
});


// =====================================
// STUDENT LEAVE HISTORY
// =====================================

router.get("/my-leave-requests/:id", async (req, res) => {
    try {
        const requests = await LeaveRequest.find({
            user: req.params.id
        }).sort({ appliedAt: -1 });

        res.json(requests);

    } catch (error) {
        console.error("Leave history error:", error);

        res.status(500).json({
            message: "Unable to load leave history."
        });
    }
});


// =====================================
// STAFF REGISTRATION
// =====================================

router.post("/staff/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Please fill all fields."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email is already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const staff = await User.create({
            username: username.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "staff"
        });

        res.status(201).json({
            message: "Staff account created successfully.",
            staff: {
                id: staff._id,
                username: staff.username,
                email: staff.email,
                role: staff.role
            }
        });

    } catch (error) {
        console.error("Staff registration error:", error);

        res.status(500).json({
            message: "Staff registration failed."
        });
    }
});


// =====================================
// STAFF LOGIN
// =====================================

router.post("/staff/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Enter email and password."
            });
        }

        const staff = await User.findOne({
            email: email.trim().toLowerCase(),
            role: "staff"
        });

        if (!staff) {
            return res.status(401).json({
                message: "Staff account not found."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            staff.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Incorrect password."
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: "JWT configuration is missing."
            });
        }

        const token = jwt.sign(
            {
                id: staff._id,
                role: "staff"
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({
            message: "Staff login successful.",
            token,
            staff: {
                id: staff._id,
                username: staff.username,
                email: staff.email,
                role: staff.role
            }
        });

    } catch (error) {
        console.error("Staff login error:", error);

        res.status(500).json({
            message: "Staff login failed."
        });
    }
});


// =====================================
// STAFF AUTHENTICATION MIDDLEWARE
// =====================================

function verifyStaff(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Please login as staff."
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (decoded.role !== "staff") {
            return res.status(403).json({
                message: "Staff access required."
            });
        }

        req.staff = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired login session."
        });
    }
}


// =====================================
// MANAGER - VIEW LEAVE REQUESTS
// =====================================

router.get(
    "/manager/leave-requests",
    verifyStaff,
    async (req, res) => {
        try {
            const requests = await LeaveRequest.find()
                .populate("user", "username email rollNumber")
                .sort({ appliedAt: -1 });

            res.json(requests);

        } catch (error) {
            console.error("Manager requests error:", error);

            res.status(500).json({
                message: "Unable to load leave requests."
            });
        }
    }
);


// =====================================
// MANAGER - APPROVE LEAVE
// =====================================

router.patch(
    "/manager/approve/:id",
    verifyStaff,
    async (req, res) => {
        try {
            const request = await LeaveRequest.findOne({
                _id: req.params.id,
                status: "pending"
            });

            if (!request) {
                return res.status(404).json({
                    message: "Pending leave request not found."
                });
            }

            const user = await User.findById(request.user);

            if (!user) {
                return res.status(404).json({
                    message: "Student not found."
                });
            }

            const balanceField =
                request.type === "casual"
                    ? "casualLeave"
                    : "medicalLeave";

            if (user[balanceField] < request.days) {
                return res.status(400).json({
                    message: "Student has insufficient leave balance."
                });
            }

            user[balanceField] -= request.days;
            await user.save();

            request.status = "approved";
            request.reviewedAt = new Date();

            await request.save();

            res.json({
                message: "Leave approved successfully.",
                request
            });

        } catch (error) {
            console.error("Approve leave error:", error);

            res.status(500).json({
                message: "Unable to approve leave."
            });
        }
    }
);


// =====================================
// MANAGER - REJECT LEAVE
// =====================================

router.patch(
    "/manager/reject/:id",
    verifyStaff,
    async (req, res) => {
        try {
            const request = await LeaveRequest.findOneAndUpdate(
                {
                    _id: req.params.id,
                    status: "pending"
                },
                {
                    status: "rejected",
                    reviewedAt: new Date()
                },
                { new: true }
            );

            if (!request) {
                return res.status(404).json({
                    message: "Pending leave request not found."
                });
            }

            res.json({
                message: "Leave rejected successfully.",
                request
            });

        } catch (error) {
            console.error("Reject leave error:", error);

            res.status(500).json({
                message: "Unable to reject leave."
            });
        }
    }
);


module.exports = router;
