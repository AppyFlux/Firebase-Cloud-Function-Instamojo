const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();
var rp = require('request-promise');
const cors = require('cors')({
  origin: true
});
var emailValidator = require("email-validator");
var insta_headers = {
  'X-Api-Key': 'API KEY',
  'X-Auth-Token': 'AUTH TOKEN'
}



exports.createRequest = functions.https.onRequest((req, res) => {


  if (req.method != 'GET')
    return res.status(403).send('Forbidden!');



  let NAME = req.query.NAME;
  let EMAIL = req.query.EMAIL;
  let MOBILE = req.query.MOBILE;

  //All validation checks goes here
  if (!NAME || !EMAIL || !MOBILE)
    return res.status(403).send({
      STATUS: "FAILURE",
      RESPONSE: "INVALID INPUTS"
    });

  if (MOBILE.length != 10 || NAME.length < 5 || EMAIL.length < 9)
    return res.status(403).send({
      STATUS: "FAILURE",
      RESPONSE: "INVALID DATA LENGTHS"
    });

  if (!emailValidator.validate(EMAIL))
    return res.status(403).send({
      STATUS: "FAILURE",
      RESPONSE: "INVALID EMAIL"
    });

  if (isNaN(MOBILE))
    return res.status(403).send({
      STATUS: "FAILURE",
      RESPONSE: "INVALID MOBILE"
    });

  
  //Data Payload
  var payload = {
    purpose: 'Android Training Course',
    amount: 2000, //Amount to Charge , Easy to make it dynamic as well
    phone: MOBILE,
    buyer_name: NAME,
    redirect_url: 'REDIRECT URL',
    webhook: "WEBHOOK URL",
    email: EMAIL,
    allow_repeated_payments: false
  }


  var options = {
    method: 'POST',
    uri: 'https://test.instamojo.com/api/1.1/payment-requests/',
    form: payload,
    headers: insta_headers,
    json: true
  };

  return rp(options)
    .then(function (response) {
      console.log(response);


      if (response.success) {

        db.collection('PAYMENT_REQUESTS').doc(response.payment_request.id).set({
            LONG_URL: response.payment_request.longurl,
            REQUEST_CREATED_AT: response.payment_request.created_at,
            PAYMENT_STATUS: "STARTED"
          }, {
            merge: true
          }).then(function () {
            res.status(200).send({
              STATUS: "SUCCESS",
              RESPONSE: response.payment_request.longurl
            });
          })
          .catch(function (error) {
            res.status(200).send({
              STATUS: "ERROR",
              RESPONSE: error
            });
          });



      } else return res.status(403).send('Forbidden!');

    })
    .catch(function (e) {
      console.log("ERROR" + e);
      res.status(200).send({
        STATUS: "ERROR",
        RESPONSE: e
      });
    });




});


exports.verifyPayment = functions.https.onRequest((req, res) => {


  if (req.method != 'POST') {
    return res.status(403).send('Forbidden!');
  }

  let responseData = req.body;

  let options = {
    method: 'GET',
    uri: `https://test.instamojo.com/api/1.1/payment-requests/${responseData.payment_request_id}/`,
    headers: insta_headers,
    json: true
  };

  return rp(options)
    .then(function (response) {
     
      if (response.success) {

        if (response.payment_request.payments.length == 0) {


          return res.status(200).send({
            STATUS: "ERROR",
            RESPONSE: "FAIL"
          });

        }


        if (response.payment_request.payments[0].status === "Credit") {


          let data = response.payment_request.payments[0];

          db.collection('PAYMENT_REQUESTS').doc(responseData.payment_request_id).set({
              AMOUNT: response.payment_request.amount,
              MODIFIED_AT: response.payment_request.modified_at,
              PAY_WITH: data.instrument_type,
              EMAIL_FROM_IM: data.billing_instrument,
              FEES: data.fees,
              PAYMENT_STATUS: "SEEMS TO BE PAID"
            }, {
              merge: true
            }).then(function () {

              sendConfirmationMail(responseData.buyer_name, responseData.buyer, responseData.payment_request_id, new Date().toString());
              return res.status(200).send({
                STATUS: "SUCCESS",
                RESPONSE: "DONE"
              });



            })
            .catch(function (error) {
              console.log("CONSOLE ERROR 1");
              return res.status(403).send({
                STATUS: "ERROR",
                RESPONSE: error
              });

            });

          return;

        }



        return res.status(403).send({
          STATUS: "ERROR",
          RESPONSE: "FAIL"
        });



      } else {


        return res.status(403).send({
          STATUS: "ERROR",
          RESPONSE: "FAIL"
        });
      }

    })
    .catch(function (e) {
      console.log("ERROR" + e);

      return res.status(403).send({
        STATUS: "ERROR",
        RESPONSE: e
      });
    });



});



function sendConfirmationMail(name, email, receipt_id, date) {

  

//Your logic to send custom mails


}