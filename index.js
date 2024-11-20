const express = require('express');
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('Connected!'));

const exerciseSchema = new mongoose.Schema({
  user_id: String,
  username: String,
  description: String,
  duration: Number,
  date: Date
});

const userSchema = new mongoose.Schema({
  username: String,
});


const Exercise = mongoose.model('Exercise', exerciseSchema);
const User = mongoose.model('User', userSchema);

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.route('/api/users')
  .post((req, res) => {
    const userName = req.body.username;
    const newUser = new User({ username: userName })
    newUser.save()
      .then((dbRes) => {
        res.json({ username: dbRes.username, _id: dbRes._id })
      }).catch(console.error)
  })
  .get((req, res) => {
    User.find()
      .then((dbRes) => {
        const usersRes = dbRes.filter(({ username }) => !!username).map(({ username, _id }) => ({ username, _id }));
        res.json(usersRes)
      }).catch(console.error)
  });

app.route('/api/users/:id/exercises')
  .post((req, res) => {
    const { description, duration, date } = req.body;
    const id = req.params.id;
    User.findById(id)
      .then((userObj) => {
        if (userObj) {
          const newExercise = new Exercise({
            user_id: userObj._id,
            description,
            duration,
            date: date ? new Date(date) : new Date()
          });
          newExercise.save()
            .then((savedExercise) => {
              const response = {
                _id: userObj._id,
                username: userObj.username,
                description: savedExercise.description,
                duration: savedExercise.duration,
                date: savedExercise.date.toDateString()
              };
              console.log(response)
              res.json(response)
            })
            .catch(console.error);
        } else {
          res.json({})
        }

      }).catch(console.error)
  })


app.get('/api/users/:_id/logs', (req, res) => {
  const id = req.params._id;
  const { from, to, limit } = req.query;
  User.findById(id)
    .then((userObj) => {
      const dateFilter = {};
      const exersiceQuery = {
        user_id: id
      };
      if (from) {
        dateFilter['$gte'] = new Date(from)
      }
      if (to) {
        dateFilter['$lte'] = new Date(to)
      }

      if (from || to) {
        exersiceQuery.date = dateFilter;
      }
      Exercise.find(exersiceQuery)
        .limit(parseInt(limit, 10) || 10)
        .then((exer) => {
          const log = exer.map(({ description, duration, date }) => ({
             description, 
             duration, 
             date : date.toDateString()
            }))
          res.json({
            _id: userObj._id,
            username: userObj.username,
            count: exer.length,
            log
          })
        }).catch(console.error)
    }).catch(console.error);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
