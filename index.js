const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const saltRounds = 10;
const jwtString = 'aIewEkdeiIdaeAsdeogDVscwQo';
const port = 3000;

let databaseAdmin = 'readProducts';
let databasePassword = 'eMPRerUNleOqrJJC';

const corsOptions = {
    origin: 'https://nutriipute.vercel.app',
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'auth-token', 'index-to-modify'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.options('*', cors(corsOptions));

mongoose.connect(`mongodb+srv://${databaseAdmin}:${databasePassword}@cluster0.c6szrff.mongodb.net/Nutriipute`);

app.get('/', (req, res) => {
    res.send("API is running");
});

const userSchema = mongoose.Schema({
    Name: {
        type: String,
        required: true
    },
    Email: {
        type: String,
        required: true,
        unique: true
    },
    Password: {
        type: String,
        required: true
    },
    Address: {
        type: Array
    },
    Cart: {
        type: Object
    },
    Orders: {
        type: Object
    },
    Date: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model("Users", userSchema);


app.post('/register', async (req, res) => {
    let check = await User.findOne({Email: req.body.Email});
    if(check) {
        return res.status(400).json({success: false, errors: "Existing User"});
    }
    let Cart = {};
    let Address = [];
    let Orders = {};
    const hashedPassword = await bcrypt.hash(req.body.Password, saltRounds).catch(e => {
        return res.status(500).json({success: false, errors: "Password Error"});
    });
    const user = new User({
        Name: req.body.Name,
        Email: req.body.Email,
        Password: hashedPassword,
        Address,
        Cart,
        Orders
    });
    await user.save().catch(e => {
        return res.status(500).json({success: false, errors: "User Error"});
    });
    res.json({success: true});
});

app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ Email: req.body.Email });
        if (!user) {
            return res.status(400).json({ success: false, errors: "User Not Found" });
        }
        
        const isPasswordValid = await bcrypt.compare(req.body.Password, user.Password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, errors: "Wrong Password" });
        }

        const data = {
            user: {
                id: user.id
            }
        };
        const token = jwt.sign(data, jwtString);
        res.json({ success: true, token });
    } catch (error) {
        console.error("Error logging in user:", error);
        return res.status(500).json({ success: false, errors: "Internal Server Error" });
    }
});

app.post('/getDefaultCart', async (req, res) => {
    const token = req.body.token;
    if(!token) {
        return res.status(400).json({success: false, errors: 'Please pass a token'});
    }
    let userId;
    try {
        const data = jwt.verify(token, jwtString);
        userId = data.user.id;
    }
    catch(error) {
        return res.status(401).json({success: false, errors: error});
    }
    const userData = await User.findOne({_id: userId});
    if(userData.Cart) {
        res.json({success: true, Cart: userData.Cart});
    }
    else {
        res.json({success: true, Cart: {}});
    }
});

app.post('/getAddress', async (req, res) => {
    const token = req.body.token;
    if(!token) {
        return res.status(400).json({success: false, errors: 'Please pass a token'});
    }
    let userId;
    try {
        const data = jwt.verify(token, jwtString);
        userId = data.user.id;
    }
    catch(error) {
        return res.status(401).json({success: false, errors: error});
    }
    const userData = await User.findOne({_id: userId});
    if(userData.Address) {
        res.json({success: true, Address: userData.Address});
    }
    else {
        res.json({success: true, Address: []});
    }
});

app.post('/addAddress', async (req, res) => {
    const token = req.header('auth-token');
    const address = req.body;
    if(!token) {
        return res.status(400).json({success: false, errors: 'Please pass a token'});
    }
    let userId;
    try {
        const data = jwt.verify(token, jwtString);
        userId = data.user.id;
    }
    catch(error) {
        return res.status(401).json({success: false, errors: error});
    }
    const userData = await User.findOne({_id: userId});
    if(userData.Address) {
        userData.Address.push(address);
    }
    else {
        userData.Address = [address];
    }
    await User.findOneAndUpdate({_id: userId}, {Address: userData.Address});
    res.json({success: true});
});

app.post('/editAddress', async (req, res) => {
    const token = req.header('auth-token');
    const indexToModify = req.header('index-to-modify');
    const address = req.body;
    if(!token) {
        return res.status(400).json({success: false, errors: 'Please pass a token'});
    }
    let userId;
    try {
        const data = jwt.verify(token, jwtString);
        userId = data.user.id;
    }
    catch(error) {
        return res.status(401).json({success: false, errors: error});
    }
    const userData = await User.findOne({_id: userId});
    if(userData.Address) {
        if(indexToModify < userData.Address.length) {
            userData.Address[indexToModify] = address;
        }
        else {
            userData.Address.push(address);
        }
    }
    else {
        userData.Address = [address];
    }
    await User.findOneAndUpdate({_id: userId}, {Address: userData.Address});
    res.json({success: true});
});

app.post('/delAddress', async(req, res) => {
    const token = req.header('auth-token');
    const index = req.body.index;
    if(!token) {
        return res.status(400).json({success: false, errors: 'Please pass a token'});
    }
    let userId;
    try {
        const data = jwt.verify(token, jwtString);
        userId = data.user.id;
    }
    catch(error) {
        return res.status(401).json({success: false, errors: error});
    }
    const userData = await User.findOne({_id: userId});
    userData.Address = userData.Address.filter((_, i) => i != index);
    await User.findOneAndUpdate({_id: userId}, {Address: userData.Address});
    res.json({success: true});
});

app.post('/addToCart', async (req, res) => {
    const token = req.header('auth-token');
    const itemName = req.body.itemName;
    if(!token) {
        return res.status(400).json({success: false, errors: 'Please pass a token'});
    }
    let userId;
    try {
        const data = jwt.verify(token, jwtString);
        userId = data.user.id;
    }
    catch(error) {
        return res.status(401).json({success: false, errors: error});
    }
    const userData = await User.findOne({_id: userId});
    if(userData.Cart) {
        userData.Cart[itemName] = userData.Cart[itemName]? userData.Cart[itemName]+1: 1; 
    }
    else {
        userData.Cart = {[itemName]: 1};
    }
    await User.findOneAndUpdate({_id: userId}, {Cart: userData.Cart});
    res.json({success: true});
});

app.post('/removeFromCart', async (req, res) => {
    const token = req.header('auth-token');
    const itemName = req.body.itemName;
    if(!token) {
        return res.status(400).json({success: false, errors: 'Please pass a token'});
    }
    let userId;
    try {
        const data = jwt.verify(token, jwtString);
        userId = data.user.id;
    }
    catch(error) {
        return res.status(401).json({success: false, errors: error});
    }
    const userData = await User.findOne({_id: userId});
    if(userData.Cart) {
        userData.Cart[itemName] = userData.Cart[itemName]-1; 
    }
    await User.findOneAndUpdate({_id: userId}, {Cart: userData.Cart});
    res.json({success: true});
});

app.post('/deleteFromCart', async (req, res) => {
    const token = req.header('auth-token');
    const itemName = req.body.itemName;
    if(!token) {
        return res.status(400).json({success: false, errors: 'Please pass a token'});
    }
    let userId;
    try {
        const data = jwt.verify(token, jwtString);
        userId = data.user.id;
    }
    catch(error) {
        return res.status(401).json({success: false, errors: error});
    }
    const userData = await User.findOne({_id: userId});
    if(userData.Cart) {
        delete userData.Cart[itemName];
    }
    await User.findOneAndUpdate({_id: userId}, {Cart: userData.Cart});
    res.json({success: true});
});

// app.use('/images', express.static('upload/images'));
app.use('/*', (req, res) => {
    res.status(404).send();
});

app.use("/", (req, res) => {
    res.send("Express App is running");
});


app.listen(port, (e) => {
    if(!e) {
        console.log("app is listening at port 3000");
    }
    else {
        console.log("Error ", e);
    }
});