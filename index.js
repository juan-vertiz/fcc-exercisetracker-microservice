const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({extended: true}))

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.ObjectId,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: false
  }
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use((req, res, next) => {
  console.log(`${req.method} - ${req.url} - ${Object.keys(req.query)} - ${Object.keys(req.body).map(key => `${key}=${req.body[key]}`)}`);
  next();
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  const user = new User({
    username: username
  });
  try {
    const savedUser = await user.save();
    res.json({
      _id: savedUser._id,
      username: savedUser.username
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({});
  res.json(users.map((user) => ({
    _id: user._id,
    username: user.username
  })));
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  const user = await User.findById(_id);
  if (!user) {
    return res.status(404).json({ error: 'Not Found' });
  }

  if (!description) {
    return res.status(400).json({ error: 'Bad Request' });
  }

  if (!duration || Number(duration) <= 0 || isNaN(Number(duration))) {
    return res.status(400).json({ error: 'Bad Request' });
  }

  const exercise = new Exercise({
    user_id: _id,
    description: description,
    duration: Number(duration),
    date: date ? new Date(date) : new Date(),
  });

  const savedExercise = await exercise.save();

  res.json({
    _id: user._id,
    username: user.username,
    description: savedExercise.description,
    duration: savedExercise.duration,
    date: savedExercise.date.toDateString(),
  });
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  const user = await User.findById(_id);
  if (!user) {
    return res.status(404).json({ error: 'Not Found' });
  }

  let query = { user_id: _id };
  if (from) {
    query.date = { $gte: new Date(from) };
  }
  if (to) {
    query.date = { ...query.date, $lte: new Date(to) };
  }

  const exercises = await Exercise.find(query)
    .limit(limit ? parseInt(limit) : undefined)
    .select('-user_id');

  res.json({
    _id: user._id,
    username: user.username,
    count: exercises.length,
    log: exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    })),
  })
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
