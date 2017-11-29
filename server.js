var http = require('http');
var url = require('url');
var fs = require('fs');
var formidable = require('formidable');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var ExifImage = require('exif').ExifImage;
var express = require('express');
var app = express();
var mongourl = "mongodb://user01:123@ds259865.mlab.com:59865/comps381f";

app.set('view engine','ejs');

app.get('/new',function(req,res){
    console.log("a new request:")
   
        res.render('new',{});
    
});


/** 
 * 
 *        Handle read api restaurant
 * 
 *  */
app.get('/api/restaurant/read/:resfields/:condition',function(req,res,next){
  //console.log(req.params.resfields + " " + req.params.condition);
  var target = req.params.resfields;
  var condition = req.params.condition;
  MongoClient.connect(mongourl,function(err,db){
    assert.equal(err,null);
    console.log('Connected to MongoDB\n');
    readDoc(db,target,condition,function(restaurants){
        res.send(restaurants);
        res.end();
    });

  });
});

/** 
 * 
 *        Handle create restaurant
 * 
 *  */
app.post('/create',function(req,res){
    console.log("a new request in create:" + req.query );

    var queryAsObject = req.query ; 

          var form = new formidable.IncomingForm();
          form.parse(req, function (err, fields, files) {
            console.log(JSON.stringify(files));
            var filename = files.restaurantPhoto.path;
           // var title = (fields.name.length > 0) ? fields.name : "untitled";
            var mimetype = files.restaurantPhoto.type;
          //  console.log("title = " + title);
            console.log("filename = " + filename);
            //
            var exif = {};
            var image = {};
            var restaurant = {};
            var address = {};
            var coord = {};
            var grades = {};
            address['street'] = fields.street;
            address['building'] = fields.building;
            address['zipcode'] = fields.zipcode;
            coord['longitude'] = fields.lon;
            coord['latitude'] = fields.lat;
            address['coord'] = coord;
            grades['user'] = '';
            grades['score'] = '';
            restaurant['restaurant_id'] = fields.restaurant_id;
            restaurant['name'] = fields.name;
            restaurant['borough'] = fields.borough;
            restaurant['cuisine'] = fields.cuisine;
            restaurant['address'] = address;
            restaurant['owner'] = fields.owner;
            image['image'] = filename;
    
            try {
              new ExifImage(image, function(error, exifData) {
                if (error) {
                  console.log('ExifImage: ' + error.message);
                }
                else {
                  exif['image'] = exifData.image;
                  exif['exif'] = exifData.exif;
                  exif['gps'] = exifData.gps;
                }
              })
            } catch (error) {
    
            }
            //
            fs.readFile(filename, function(err,data) {
              MongoClient.connect(mongourl,function(err,db) {
               
               // new_r['title'] = title;
               restaurant['image'] = new Buffer(data).toString('base64');
               restaurant['mimetype'] = mimetype;

              //  new_r['exif'] = exif;
              insertDoc(db,restaurant,function(result) {
                  db.close();
                  if (result) {
                    //res.render('created',restaurant);
                    res.send(restaurant);
                    res.end('Unable to insert!');   
                  } else {
                    res.writeHead(500, {"Content-Type": "text/plain"});
                    res.end('Unable to insert!');              
                  }
                })
              });
            })
          });
        
        //res.render('new',{});
    
});




app.get('/api/restaurant/create',function(req,res){
  console.log("a new request insert:");
  response = {};
      
//  var filename = files.restaurantPhoto.path;
 //  var mimetype = files.restaurantPhoto.type;
 
  // console.log("filename = " + filename);
  
       var exif = {};
        var image = {};
        var restaurant = {};
        var address = {};
        var coord = {};
        var grades = {};
        
        address['street'] = req.query.street;
        address['building'] = req.query.building;
        address['zipcode'] = req.query.zipcode;
        coord['longitude'] = req.query.lon;
        coord['latitude'] = req.query.lat;
        address['coord'] = coord;
        grades['user'] = '';
        grades['score'] = '';
        restaurant['restaurant_id'] = req.query.restaurant_id;
        restaurant['name'] = req.query.name;
        restaurant['borough'] = req.query.borough;
        restaurant['cuisine'] = req.query.cuisine;
        restaurant['address'] = address;
        restaurant['owner'] = req.query.owner;
      
        
        MongoClient.connect(mongourl,function(err,db) {
          
          // new_r['title'] = title;

         //  new_r['exif'] = exif;
         insertRestaurantAPI(db,restaurant,function(result){
          db.close();
          
           if (err == null) {
            response['status'] = 'ok'

           } else {
            response['status'] = 'failed'   
           }
           res.send(response);
         });

            
         
         });
         
  
});

function readDoc(db,target,condition,callback){
  var restaurant = [];
  var criteria = {};
  console.log(target + " " +condition);
  criteria[target] = condition;
  console.log('criteria: '+ criteria);
  cursor = db.collection('restaurants').find(criteria);
  cursor.each(function(err,doc){
    assert.equal(err,null);
    if(doc != null){
      restaurant.push(doc);
    }else{
      callback(restaurant);
    }
  });

}
function insertDoc(db,r,callback) {
    console.log('image size: ' + r.image.length);
    if (r.image.length < 14000000) {
      db.collection('restaurants').insertOne(r,function(err,result) {
        assert.equal(err,null);
        console.log("insert was successful!");
        console.log(JSON.stringify(result));
        callback(result);
      });
    } else {
      callback(null);
    }
  }

function insertRestaurantAPI(db,r,callback){
  db.collection('restaurants').insertOne(r,function(err,result) {
    assert.equal(err,null);
    console.log("insert was successful!");
    console.log(JSON.stringify(result));
    callback(result);
  });
}
app.listen(app.listen(process.env.PORT || 8099 ));
