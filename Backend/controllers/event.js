var database = require('../database');
var event = module.exports;

event.createEvent = function(req, res, next) {
  //create the event model from request object
  var event = new database.eventModel({
    "what": req.body.what,
    "why": req.body.why,
    "where": req.body.where,
    "when": req.body.when,
    "endDate": req.body.endDate,
    "fromTime" : req.body.fromTime,
    "toTime" : req.body.toTime,
    "picture": req.body.picture
  });
  //search the user document for the userid based on there token
  database.userModel.findOne({token : req.headers["x-access-token"]}, function(err, token){
    if(err)
      console.log(err);
    else{
      //set the user as the event owner
      event.members.push({UserId: parseInt(token.UserID), friendlyName : token.friendlyName, isAttending: "Owner", isPaying: true});
      //save the event
      event.save(function(err, result) {
        if (err)
          console.log(err);
        else{
          token.events.push({eventID: result.EventID});
          token.save();
          var messages = new database.messagesModel({
            "EventID": result.EventID
          });

          messages.save(function(err, result){
            if(err)
              console.log(err);
            else{
              var message = new database.messageModel({
                "message" : "Event Created",
                "userID" : 0,
                "friendlyName" : "System"
              });
              result.messages.push(message);
              result.save();
            }
          });
          res.sendStatus(201);
        }
      });
    }
  });
}

event.getEventById = function(req, res, next) {
  database.userModel.findOne({token : req.headers["x-access-token"]}, function(err, token){
    if(err)
      console.log("error"  + err);
    else{
      database.eventModel.findOne({"EventID" : req.params.id}).lean().exec(function(err, events){
        if(err)
          console.log(err);
        else{
          database.eventModel.findOne({"EventID" : req.params.id}).where("members.UserId").in(token.UserID).
          select("-_id EventID what why where when endDate picture fromTime toTime itemList totalEstCost totalActCost members").lean().exec(function(err, result){
              for(var j = 0; j < result.members.length;j++){
                if(result.members[j].UserId == token.UserID)
                  result.isAttending = result.members[j].isAttending;
              }
            res.status(200).json(result);
          });
        }
      });
    }
  });
}

event.getAllEvents = function(req, res, next) {
  database.eventModel.find({}, function(err, events) {
    if (err)
      console.log(err);
    else {
      res.status(200).send(events);
    }
  });
}

event.getUsersEvents = function(req, res, next) {
  //search the user document for the userid based on there token
  database.userModel.findOne({token : req.headers["x-access-token"]}, function(err, token){
    if(err)
      console.log("error"  + err);
    else{
      database.eventModel.find({"members.UserId": token.UserID}).lean().exec(function(err, events){
        if(err)
          console.log(err);
        else{
          database.eventModel.find().where("members.UserId").in(token.UserID).
          select("-_id EventID what why where when endDate picture fromTime toTime itemList totalEstCost totalActCost members").lean().exec(function(err, result){
            for(var i = 0; i < result.length;i++){
              for(var j = 0; j < result[i].members.length;j++){
                if(result[i].members[j].isAttending == "Owner"){
                  result[i].friendlyName = result[i].members[j].friendlyName;
                }
                if(result[i].members[j].UserId == token.UserID){
                  result[i].isAttending = result[i].members[j].isAttending;
                }
              }
            }
            res.status(200).json(result);
          });
        }
      });
    }
  });
}

event.getMembersByEventId = function(req, res, next){
  database.eventModel.findOne({"EventID" : req.params.id}, function(err, event){
    if(err)
      console.log(err);
    else{
      res.status(200).json(event.members);
    }
  })
}

event.updateEvent = function(req, res, next) {
  database.eventModel.findOne({"EventID" : req.params.id}, function(err, event){
    if(err)
      console.log(err);
    else{
      event.EventID = event.EventID;
      event.what = req.body.what || event.what;
      event.why = req.body.why || event.why;
      event.where = req.body.where || event.where;
      event.when = req.body.when || event.when;
      event.endDate = req.body.endDate || event.endDate;
      event.fromTime = req.body.fromTime || event.fromTime;
      event.toTime = req.body.toTime || event.toTime;
      event.picture = req.body.picture || event.picture;
      event.save(function(err, result){
        if(err)
          console.log(err);
        else{
          database.messagesModel.findOne({"EventID" : req.params.id}, function(err, message){
            if(err)
              console.log(err);
            else{
              var text = new database.messageModel({
                "message" : "Event Updated",
                "userID" : 0,
                "friendlyName" : "System"
              });
              message.messages.push(text);
              message.save();
            }
          });

          res.sendStatus(200);
        }
      });
    }
  });
}

event.deleteEvent = function(req, res, next) {
  database.userModel.findOne({token: req.headers["x-access-token"]}, function(err, user){
    if(err)
      console.log(err);
    else{
      database.eventModel.findOne({"EventID" : req.params.id}, function(err, event){
        if(err)
          console.log(err);
        else{
          for(var i = 0; i < event.members.length;i++){
            if(event.members[i].UserId == user.UserID && event.members[i].isAttending !== 'Owner'){
              res.status(409).send("Only the owener can delete the event");
            }
            else if(event.members[i].UserId == user.UserID && event.members[i].isAttending == 'Owner'){
              database.eventModel.remove({
                "EventID": req.params.id
              }, function (err, event) {
                if (err)
                  console.log(err);
                else{
                  res.sendStatus(200);
                }
              });
            }
          }
        }
      });
    }
  });
}

event.createListItem = function(req, res, next) {
  database.eventModel.findOne({
    "EventID": req.params.id
  }, function(err, event) {
    if (err)
      console.log(err);
    else {
      var list = new database.listModel({
        "item": req.body.item,
        "estCost": req.body.estCost || 0,
        "actCost": req.body.actCost || 0
      });
      event.itemList.push(list);
      event.save(function(err, data){
        if(err)
          console.log(err)
        else{
          database.eventModel.calculateMoney(parseInt(req.params.id),function(result){
            event.totalEstCost = result[0].estCost;
            event.totalActCost = result[0].actCost;
            event.save();
          });
          database.messagesModel.findOne({"EventID" : req.params.id}, function(err, message){
            if(err)
              console.log(err);
            else{
              var text = new database.messageModel({
                "message" : "Item " + req.body.item + " was added",
                "userID" : 0,
                "friendlyName" : "System"
              });
              message.messages.push(text);
              message.save();
            }
          });
          res.sendStatus(201);
        }
      });
    }
  });
}

event.getListItems = function(req, res, next) {
  database.eventModel.findOne({
    "EventID": req.params.id
  }, function(err, events) {
    if (err)
      console.log(err);
    else {
      res.status(200).send(events.itemList);
    }
  });
}

event.claimItem = function(req, res, next){
  database.userModel.findOne({token: req.headers["x-access-token"]}, function(err, result){
    if(err)
      console.log(err);
    else{
      database.eventModel.update({"itemList.ListID" : req.params.item, "EventID" : req.params.id},
      {$set : { "itemList.$.whoseBringing": result.friendlyName}},
      function(err, item){
        if(err)
          console.log(err);
        else{
          database.messagesModel.findOne({"EventID" : req.params.id}, function(err, message){
            if(err)
              console.log(err);
            else{
              var text = new database.messageModel({
                "message" : "ItemID " + req.params.item + " was claimed by " + result.friendlyName,
                "userID" : 0,
                "friendlyName" : "System"
              });
              message.messages.push(text);
              message.save();
            }
          });
          res.sendStatus(201);
        }
      });
    }
  });
}

event.deleteItem = function(req, res, next){
  database.eventModel.findOneAndUpdate({"itemList.ListID" : req.params.item, "EventID" : req.params.id},
  {$pull: {"itemList": {"ListID" : req.params.item}}},
  function(err, item){
    if(err)
      console.log(err);
    else
      database.eventModel.calculateMoney(parseInt(req.params.id), function(result) {
        item.totalEstCost = result[0].estCost;
        item.totalActCost = result[0].actCost;
        item.save(function(err) {
          if (err)
            console.log(err);
          else{
            database.messagesModel.findOne({"EventID" : req.params.id}, function(err, message){
              if(err)
                console.log(err);
              else{
                var text = new database.messageModel({
                  "message" : "ItemID " + req.params.item + " was deleted",
                  "userID" : 0,
                  "friendlyName" : "System"
                });
                message.messages.push(text);
                message.save();
              }
            });
            res.sendStatus(201);
          }
        });
      });
  });
}

event.updateItem = function(req, res, next){
  database.eventModel.findOne({"itemList.ListID" : req.params.item, "EventID" : req.params.id}, function(err, result){
    if(err)
      console.log(err);
    else{
      for(var i = 0; i < result.itemList.length;i++){
        if(result.itemList[i].ListID == req.params.item){
          result.itemList[i].ListID = result.itemList[i].ListID;
          result.itemList[i].item = req.body.item || result.itemList[i].item;
          result.itemList[i].actCost = req.body.actCost || result.itemList[i].actCost;
          result.itemList[i].estCost = req.body.estCost || result.itemList[i].estCost;
            result.save(function(err, saved){
              if(err)
                console.log(err);
              else{
                database.eventModel.calculateMoney(parseInt(req.params.id), function(calc) {
                  saved.totalEstCost = calc[0].estCost;
                  saved.totalActCost = calc[0].actCost;
                  saved.save(function(err) {
                    if (err)
                      console.log(err);
                    else{
                      database.messagesModel.findOne({"EventID" : req.params.id}, function(err, message){
                        if(err)
                          console.log(err);
                        else{
                          var text = new database.messageModel({
                            "message" : "ItemID " + req.params.item + " was updated",
                            "userID" : 0,
                            "friendlyName" : "System"
                          });
                          message.messages.push(text);
                          message.save();
                        }
                      });
                      res.json(saved);
                    }
                  });
                });
              }
            });
        }
      }
    }
  });
}

event.inviteFriend = function(req, res, next){
  database.eventModel.findOne({"EventID" : req.params.id}, function(err, event){
    if(err)
      console.log(err);
    else{
      console.log(event);
      database.userModel.findOne({"UserID" : req.params.friendId}, function(err, user){
        if(err)
          console.log(err);
        else{
          database.eventModel.findOne({$and:[{"EventID": req.params.id},{"members.UserId": user.UserID}]}, function(err, member){
            if(err)
              console.log(err);
            else{
              if(member){
                res.status(409).send("member is already invited to the event");
              }
              else{
                event.members.push({UserId: user.UserID, friendlyName: user.friendlyName, isAttending: "Invited"});
                user.events.push({eventID:req.params.id});
                user.save(function(err){
                  if(err)
                    console.log(err);
                });
                event.save(function(err){
                  if(err)
                    console.log(err);
                  else{
                    database.messagesModel.findOne({"EventID" : req.params.id}, function(err, message){
                      if(err)
                        console.log(err);
                      else{
                        var text = new database.messageModel({
                          "message" : "User " + user.friendlyName + " was invited to the event",
                          "userID" : 0,
                          "friendlyName" : "System"
                        });
                        message.messages.push(text);
                        message.save();
                      }
                    });
                    res.sendStatus(200);
                  }
                });
              }
            }
          });
        }
      });
    }
  });
}

event.invitation = function(req, res, next){
  var bool;
  var response;
  if(req.params.answer == "Attending"){
    bool = true;
    response = "Accepted";
  }
  else{
    bool = false;
    response = "Declined";
  }

  database.userModel.findOne({token: req.headers["x-access-token"]}, function(err, user){
    if(err)
      console.log(err);
    else{
      database.eventModel.update({$and:[{"EventID": req.params.id},{"members.UserId": user.UserID}]},
       {$set: {"members.$.isAttending" : req.params.answer, "members.$.isPaying" : bool}},
       function(err, event){
        if(err)
          console.log(err);
        else{
          database.messagesModel.findOne({"EventID" : req.params.id}, function(err, message){
            if(err)
              console.log(err);
            else{
              var text = new database.messageModel({
                "message" : "User " + user.friendlyName + " has "+ response + " the invitation to the event",
                "userID" : 0,
                "friendlyName" : "System"
              });
              message.messages.push(text);
              message.save();
            }
          });
          res.sendStatus(200);
        }
      });
    }
  });
}

event.leave = function(req, res, next){
  database.userModel.findOne({token: req.headers["x-access-token"]}, function(err, user){
    if(err)
      console.log(err);
    else{
      database.eventModel.findOne({"EventID" : parseInt(req.params.id)}, function(err, event){
        if(err)
          console.log(err);
        else{
          for(var i = 0; i < event.members.length;i++){
            if(event.members[i].UserId == user.UserID && event.members[i].isAttending == 'Owner')
              res.status(409).send("The Owner cannot be removed from the event");
          }
          user.events.pull({_id: null, eventID : req.params.id});
          user.save(function(err){
            if(err)
              console.log(err);
            else{
              database.messagesModel.findOne({"EventID" : req.params.id}, function(err, message){
                if(err)
                  console.log(err);
                else{
                  var text = new database.messageModel({
                    "message" : "User " + user.friendlyName + " has left the event",
                    "userID" : 0,
                    "friendlyName" : "System"
                  });
                  message.messages.push(text);
                  message.save();
                }
              });
            }
          });
          event.members.pull({UserId : user.UserID});
          event.save();
          res.sendStatus(200);
        }
      });
    }
  });
}

event.paying = function(req, res, next){
  database.userModel.findOne({UserID: req.params.friendId}, function(err, user){
    if(err)
      console.log(err);
    else{
      database.eventModel.update({$and:[{"EventID": req.params.id},{"members.UserId": user.UserID}]},
       {$set: {"members.$.isPaying" : req.body.answer}},
       function(err, event){
        if(err)
          console.log(err);
        else{
          res.sendStatus(200);
        }
      });
    }
  });
}

event.budget = function(req, res, next){
  var results = [];
  var claimedTotal = 0;
  var dividedTotal = 0;
  var isPayingCount = 0;
  var claimers = [];

  database.eventModel.findOne({"EventID": parseInt(req.params.id)}, function(err, event){
    if(err)
      console.log(err);
    else{
        //compare with each attending member
        for(var i=0; i<event.members.length; i++){
          var claimedValue = 0;

          for(var j=0; j<event.itemList.length; j++){
            if(event.members[i].friendlyName == event.itemList[j].whoseBringing){
              claimedValue += event.itemList[j].actCost;
              claimedTotal += event.itemList[j].actCost;
            }
          }
          var obj = {
            friendlyName: event.members[i].friendlyName,
            userId: event.members[i].UserId,
            claimedValue: claimedValue,
            isPaying: event.members[i].isPaying,
            isAttending: event.members[i].isAttending
          };
          results.push(obj);
        }
      }

      for(var i=0; i<results.length; i++){
        if (results[i].isPaying == true)
          isPayingCount++;
      }

      for(var i=0; i<results.length; i++){
        if (results[i].isPaying == true){
          results[i].dividedTotal = (claimedTotal/isPayingCount);
          results[i].toPay = (claimedTotal/isPayingCount) - results[i].claimedValue;
        }
        else {
          results[i].dividedTotal = 0;
          results[i].toPay = 0;
        }
      }

      res.status(200).send(results);

  });
}
