const User = require("./../models/userSchema")
const cloudinary = require('cloudinary').v2;

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching users', error: error.message });
    }
};

exports.userLogin = async (req, res) => {
    try {
        const { password, name } = req.body;
        let userData = await User.findOne({ name });
        if (!userData) {
            return res.status(400).json({ error: "User not found. Please ensure you are using the right credentials" });
        }

        if (password !== userData.password) {
            return res.status(403).json({ error: "Incorrect password, please try again" });
        } else {

            const token = await userData.generateAuthtoken();
            return res.status(200).json({ message: "User login successful", role: userData.role ,userToken: token, userId: userData._id });
        }


    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}

exports.getUserById = async (req, res, next) => {
    try {
        const userId = req.params.id; // Extract the user ID from the request parameters
        const user = await User.findById(userId); // Find the user by ID using Mongoose

        if (!user) {
            return res.status(404).send({
                message: "User not found. Please ensure you are using the right credentials"
            });
        }

        // If the user is found, send the user data as JSON
        res.status(200).json({
            message: "User found successfully",
            data: user
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}

exports.updateProfile = async (req, res) => {
    console.log("Request body:", req.body);
    console.log("Files:", req.file);
    // Parse the form data
    const { name, email, role, password, userId } = req.body;

    try {
        // Find the user by ID
        console.log("Searching for user with ID:", userId);
        const preuser = await User.findOne({ _id: userId });

        // Check if user exists
        if (!preuser) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if the new email already exists for a different user
        const existingUser = await User.findOne({ email, _id: { $ne: userId } });
        if (existingUser) {
            return res.status(400).json({ error: "Email address already in use" });
        }

        // If a new file is uploaded, update the image URL
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            const imageURL = result.secure_url;
            preuser.imageURL = imageURL;
        }

        // Update user information
        preuser.email = email;
        preuser.name = name;
        preuser.role = role;
        preuser.password = password;

        console.log(preuser);

        // Save the updated user
        await preuser.save();

        // Respond with updated user data
        res.status(200).json({ message: "User profile updated successfully", user: preuser });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern.email === 1) {
            // Duplicate email error
            return res.status(400).json({ error: "Email address already in use" });
        } else {
            console.error("Error updating user profile:", error);
            res.status(500).json({ error: "Failed to update user profile" });
        }
    }
};