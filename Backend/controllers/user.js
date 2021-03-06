//Load datbase connection file
var database = require('../database');
//Load the user model Schema
var userSchema = require('../models/user');
//Load JSON WEB TOKEN DEPENDANCY
var jwt = require('jsonwebtoken');
//import config file
var config = require('../config');

var user = module.exports;

//Create a new user
user.createUser = function(req, res, next ){

  //Create new user object
  var userObj = new database.userModel({
    "friendlyName": req.body.friendlyName,
    "email": req.body.email,
    "hashPassword": req.body.hashPassword,
    "firstName": req.body.firstName,
    "lastName": req.body.lastName,
    "profilePic": req.body.profilePic
  });

  //Find an existing email address or friendlyName, due to unique constraint on fields
  database.userModel.findOne({$or:[{"email": userObj.email},{"friendlyName": userObj.friendlyName}]}, function(err, data){
    //If no errors found
    if(!err){
      //If email already exists
      if (data){
        if(data.email == userObj.email){
          console.log("Email already registered.")
          res.status(409).send('Duplicate email address found.')
        }
        else if(data.friendlyName == userObj.friendlyName){
          console.log("Friendly name already taken.");
          res.status(409).send('Duplicate friendlyName address found.');
        }
      }else{
        //Save the new user to database
        userObj.save(function(err) {
          if (err)
            console.log(err);
          else
            res.sendStatus(201);
        });
      }
    }
    else {
      res.sendStatus(500);
    }
  });
};

//Sends a users info when searching by ID
user.findUserByID = function(req, res, next){
  database.userModel.findOne({"UserID": req.params.id}, function(err, user){
    if(!err){
      if(user){
        res.json(user);
      }else {
        res.status(409).send("User not found.");
      }
    }else {
      res.sendStatus(500);
    }
  }).select({_id:0, email:1, friendlyName: 1, UserID: 1, firstName: 1, lastName:1});
};

//Sends user info when searching for a user by friendlyName, also used for searching for friends.
//Searching is case sensitive, must decide on validation to have friendlyName in all lowercase or first Letter capital
user.findUserByFriendlyNameOrEmail = function(req, res, next){
  database.userModel.findOne({$or:[{"email": req.params.param},{"friendlyName": req.params.param}]}, function(err, user){
    if(!err){
      if(user){
        res.json(user);
      }else {
        res.status(409).send("User not found.");
      }
    }else {
      res.sendStatus(500);
    }
  }).select({_id:0, email:1, friendlyName: 1, UserID: 1, firstName: 1, lastName:1})
};

//Update a user information depending on the User ID sent
user.updateUser = function(req, res, next){};

//Add a friend to an existing user
user.addNewFriend = function(req, res, next){
  //Find and return the data for the selected user and find if the user exists
  database.userModel.findOne({"UserID": req.params.id}, function(err, data){
    if(!err){
      if(!data){
        res.status(409).send("User not found.");
      }else {
        //If the User exists find if the friend has already been added to the friends list
        database.userModel.findOne({"friendList.userID": req.body.userID, "UserID": req.params.id}, function(err, friend){
          if(friend){
            res.status(409).send("User is already in friends list.");
            console.log("User is already a friend.");
          }else{
              //If the friend is not already on the friends list then
              //Create a new friend list item
              var item = {userID: req.body.userID};
              //Add the item to the friends list and then save it to the user
              data.friendList.push(item);
              data.save(function(err) {
                if (err){
                  console.log(err);
                  res.sendStatus(500);
                }else{
                  res.sendStatus(201);
                }
              });
          }
        }
      );
      }
    }else{
      res.sendStatus(500);
    }
  }
);
}

//Retrieving User's Friend List
user.getAllFriends = function(req, res, next){
  var listOfFriendID = {id:[]}
    database.userModel.findOne({"UserID": req.params.id}, function(err, friendID){
      if(!err){
        if(friendID){
          for(var i=0; i <friendID.friendList.length; i++){
            listOfFriendID.id.push(friendID.friendList[i].userID);
          }
          //console.log(listOfFriendID);
          database.userModel.find({"UserID": {$in: listOfFriendID.id}}, function(err, friends){
            if(!err){
              if(friends){
                res.json(friends);
              }
            }else{
              res.sendStatus(500);
            }
          }
        ).select({_id:0, email:1, friendlyName: 1, UserID: 1, firstName: 1, lastName:1})
        }
      }
    }
  );
};

//Delete Friend from a User's friend list
user.removeFriend = function(req, res, next){
  database.userModel.findOneAndUpdate({"UserID": req.params.id, "friendList.userID": req.params.friendId},
  {$pull: {"friendList": {"userID" : req.params.friendId}}}, function(err, friend){
    if(!err){
      if(friend){
        friend.save(function(err){
          if(err){
            console.log(err);
            res.status(409).send("Friend could not be deleted.");
          }else{
            res.status(201).send("Friend deleted from list.");
          }
        });
      }else{
        res.status(409).send("Friend was not found.");
      }
    }else{
      res.sendStatus(500);
    }
  }
);
}

//Login User method to verify an existing user.
user.loginUser = function(req, res, next){
  database.userModel.findOne({$or:[{"email": req.body.username},{"friendlyName": req.body.username}]}, function(err,user){
    if(!err){
      if(!user){
        res.json({ success: false, message: 'Authentication failed. User not found.' });
      }else if(user){
        user.comparePassword(req.body.password, function(err, isMatch){
          if(err){
            console.log(err);
          }else if(isMatch){
            var token = jwt.sign(user.friendlyName, config.secret);
            user.token = token;
            user.save(function(err, result){
              if(err)
                console.log(err);
            });
            res.json({success: true, message: 'Enjoy your token!', token: token, userID: user.UserID});
          }else{
            res.json({ success: false, message: 'Authentication failed. Wrong password.' });
          }
        }
      );
      }
    }else{
      res.sendStatus(500);
    }
  }
);
}
