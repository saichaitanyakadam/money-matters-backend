import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = async (req, res) => {
  const { username, password, profilePic, email } = req.body;

  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      res.status(409).send("user already exists with same username");
    }

    const emailExist = await User.findOne({ email });
    if (emailExist) {
      res.status(409).send("user already exists with same email address");
    }

    let profilePicPath;
    if (
      req.files &&
      Array.isArray(req.files.profilePic) &&
      req.files.profilePic.length > 0
    ) {
      profilePicPath = req.files.profilePic[0].path;
    }
    const profilePicUrl = await uploadOnCloudinary(profilePicPath);
    const user = await User.create({
      username,
      password,
      email,
      profilePic: profilePicUrl?.url || "",
    });
    const userCreated = await User.findById(user._id).select("-password");
    if (!userCreated)
      res.status(500).send("Something went wrong while registering user");
    res.status(201).send("User registered successfully");
  } catch (error) {
    console.error(error);
  }
};

const loginUser = async (req, res) => {
  const { username, password } = req.body;
  if ([username, password].some((field) => field === "")) {
    res.send("Enter Username or Password").status(400);
  }

  const user = await User.findOne({ $or: [{ username }, { email: username }] });
  if (!user) {
    res.status(404).send("user doesn't exists");
  }
  if (user) {
    const passwordCheck = await user.isPasswordCorrect(password);
    if (!passwordCheck) {
      res.status(401).send("Invalid Credentials");
    } else {
      const cookie = await user.generateAccessToken();
      res.status(200).send(cookie);
    }
  }
};

const userProfile = async (req, res) => {
  const profile = await User.findById(req.user._id).select(
    "-createdAt -updatedAt -password"
  );
  res.status(200).send(profile);
};

const profileEdit = async (req, res) => {
  const { username, email, password, profilePic } = req.body;
  try {
    const userExists = await User.findOne({ username });
    if (userExists && userExists.username !== req.user.username) {
      res.status(409).send("already user exist with same username");
    }

    const emailExist = await User.findOne({ email });

    if (emailExist && emailExist.email !== req.user.email) {
      res.status(409).send("already user exist with same email address");
    }
    const updateFileds = {};
    if (username) {
      updateFileds.username = username;
    }
    if (email) {
      updateFileds.email = email;
    }
    if (password) {
      updateFileds.password = password;
    }
    let profilePicPath;
    if (
      req.files &&
      Array.isArray(req.files.profilePic) &&
      req.files.profilePic.length > 0
    ) {
      profilePicPath = req.files.profilePic[0].path;
    }
    const profilePicUrl = await uploadOnCloudinary(profilePicPath);
    if (profilePicUrl?.url) updateFileds.profilePic = profilePicUrl?.url;

    const user = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $set: updateFileds },
      { new: true }
    ).select("-password -createdAt -updatedAt");
    res.status(200).send(user);
  } catch (error) {
    console.error(error);
  }
};

export { registerUser, loginUser, userProfile, profileEdit };
