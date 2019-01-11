//require ask-sdk-core node module.
const Alexa = require('ask-sdk-core');
const AWS = require("aws-sdk");
const APP_NAME = "Conrad Progress Report Skill";
const messages = {
  NOTIFY_MISSING_PERMISSIONS: 'Please enable profile permissions in the Amazon Alexa app.',
  ERROR: 'Uh Oh. Looks like something went wrong.'
};
const FULL_NAME_PERMISSION = "alexa::profile:name:read";
const EMAIL_PERMISSION = "alexa::profile:email:read";


var projectName = '';
var userName = '';
var userEmail = '';

var ProjectName ='empty';
var ProblemOrChallenges ='empty';
var TaskPlan15Days ='empty';
var TaskPlanNextMonth ='empty';
var LessonsLearned ='empty';
var NotesOrComments ='empty';
var first =true;
var send = true;
var tempcontent='';
/* INTENT HANDLERS */

//when you invoke your skill, you will triger this handler
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    initial();
    const { serviceClientFactory, responseBuilder } = handlerInput;
      try {
        const upsServiceClient = serviceClientFactory.getUpsServiceClient();
        const profileName = await upsServiceClient.getProfileName();
        console.log(profileName+'test2');
        const profileEmail = await upsServiceClient.getProfileEmail();
        console.log(profileEmail+'test2');
        userName += profileName;
        userEmail += profileEmail;
        console.log("REached here 1111");
        const speechResponse = `Hello, ${profileName}. Welcome to Conrad Reporting Skill. Please say "start report" to get started.`;

        return responseBuilder
                        .speak(speechResponse)
                        .reprompt(`Please say "start report" to get started.`)
                        .withSimpleCard(APP_NAME, speechResponse)
                        .getResponse();
      } catch (error) {
        console.log(JSON.stringify(error));
        if (error.statusCode == 403) {
          return responseBuilder
          .speak(messages.NOTIFY_MISSING_PERMISSIONS)
          .withAskForPermissionsConsentCard([FULL_NAME_PERMISSION])
          .getResponse();
        }
        console.log(JSON.stringify(error));
        const response = responseBuilder.speak(messages.ERROR).getResponse();
        return response;
      }
   },
};


const InProgressProgressReport = {
    canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      return request.type === 'IntentRequest'
        && request.intent.name === 'ProgressReport'
        && request.dialogState !== 'COMPLETED';  //&& request.dialogState !== 'COMPLETED'; means you have not finish the conversation
    },
    handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const slotvalues_notresolved = getSlotValues(filledSlots);
        const content = slotvalues_notresolved.content.resolved;
        
        if(ProjectName=='empty'){
            if(!first){
                ProjectName = content;
                speechResponse = 'what is your task paln for the next fifteen days?';
            }else{
                speechResponse = 'what is your project name?';
            }
            first =false;
        }else if(TaskPlan15Days=='empty'){
            tempcontent += content;
            if(tempcontent.includes('finish')){
                tempcontent = tempcontent.substring(0, tempcontent.indexOf('finish'));
                if(tempcontent.includes('course')||tempcontent.includes('term goal')||tempcontent.includes('action plan')||
                tempcontent.includes('objective')||tempcontent.includes('milestone')||tempcontent.includes('event')
                  ||tempcontent.includes('mentor')||tempcontent.includes('advisor')||tempcontent.includes('brief')){
                    TaskPlan15Days = tempcontent;
                    speechResponse = 'what is your problem or challenges?';
                    tempcontent='';
                  }else{
                    tempcontent='';
                    speechResponse='emmm please answer something related to .....';
                  }
              }else{
                    speechResponse = 'what else ?';
              }
        }else if(ProblemOrChallenges=='empty'){
            tempcontent += content;
            if(content.includes('finish')){
                tempcontent = tempcontent.substring(0, tempcontent.indexOf('finish'));
                if(tempcontent.includes('course')||tempcontent.includes('term goal')||tempcontent.includes('action plan')||
                tempcontent.includes('objective')||tempcontent.includes('milestone')||tempcontent.includes('event')
                  ||tempcontent.includes('mentor')||tempcontent.includes('advisor')||tempcontent.includes('brief')){
                    ProblemOrChallenges = tempcontent;
                    speechResponse = 'what is your lessons learned?';
                    tempcontent='';
                  }else{
                    tempcontent='';
                    speechResponse='emmm please answer something related to .....';
                  }
              }else{
                    speechResponse = 'what else ?';
              }
        }else if(LessonsLearned=='empty'){
            tempcontent += content;
            if(content.includes('finish')){
                tempcontent = tempcontent.substring(0, tempcontent.indexOf('finish'));
                if(tempcontent.includes('course')||tempcontent.includes('term goal')||tempcontent.includes('action plan')||
                tempcontent.includes('objective')||tempcontent.includes('milestone')||tempcontent.includes('event')
                  ||tempcontent.includes('mentor')||tempcontent.includes('advisor')||tempcontent.includes('brief')){
                    LessonsLearned = tempcontent;
                    speechResponse = 'what is your task for the next month?';
                    tempcontent='';
                  }else{
                    tempcontent='';
                    speechResponse='emmm please answer something related to .....';
                  }
              }else{
                    speechResponse = 'what else ?';
              }
        }else if(TaskPlanNextMonth=='empty'){
            tempcontent += content;
            if(content.includes('finish')){
                tempcontent = tempcontent.substring(0, tempcontent.indexOf('finish'));
                if(tempcontent.includes('course')||tempcontent.includes('term goal')||tempcontent.includes('action plan')||
                tempcontent.includes('objective')||tempcontent.includes('milestone')||tempcontent.includes('event')
                  ||tempcontent.includes('mentor')||tempcontent.includes('advisor')||tempcontent.includes('brief')){
                    TaskPlanNextMonth = tempcontent;
                    speechResponse = 'what are your notes or comments?';
                    tempcontent='';
                  }else{
                    tempcontent='';
                    speechResponse='emmm please answer something related to .....';
                  }
              }else{
                    speechResponse = 'what else ?';
              }
        }else if(NotesOrComments=='empty'){
            tempcontent += content;
            if(content.includes('finish')){
                tempcontent = tempcontent.substring(0, tempcontent.indexOf('finish'));
                if(tempcontent.includes('course')||tempcontent.includes('term goal')||tempcontent.includes('action plan')||
                tempcontent.includes('objective')||tempcontent.includes('milestone')||tempcontent.includes('event')
                  ||tempcontent.includes('mentor')||tempcontent.includes('advisor')||tempcontent.includes('brief')){
                    NotesOrComments = tempcontent;
                    speechResponse = `Progress Report:
                        Project Name: ${ProjectName}.
                        Task(s) Planned for the Month and next 15 days: ${TaskPlan15Days}.
                        Problem or Challenges you faced and had to manage：${ProblemOrChallenges}.
                        Lesson(s) Learned： ${LessonsLearned}.
                        Task(s) Planned for Next Month： ${TaskPlanNextMonth}.
                        Notes or Comments ${NotesOrComments}. `; 
                    tempcontent='';
                  }else{
                    tempcontent='';
                    speechResponse='emmm please answer something related to .....';
                  }
              }else{
                    speechResponse = 'what else ?';
              }
        }
        if(NotesOrComments=='empty'){
            return handlerInput.responseBuilder
                .speak(speechResponse)
                .reprompt('ghjgjhgjhghj')
                .addElicitSlotDirective('content')
                .getResponse();
        }else {
            const currentDate = getTodaysDate();
        if(send) {
            var emailBody =  `<html>
                          <head><b>Progress Report</b></head>
                          <body> 
                              <p> <b>Student Name :</b> ${userName} </p>
                              <p> <b> Project Name:</b> ${ProjectName} </p>
                              <p> <b> Reporting Date:</b> ${currentDate} </p><br/>
                              <h4>Task(s) Planned for the Month and next 15 days：</h4> <p> ${TaskPlan15Days} </p>
                              <h4>Problem or Challenges you faced and had to manage：</h4> <p> ${ProblemOrChallenges}</p>
                              <h4>Lesson(s) Learned：</h4> <p>  ${LessonsLearned} </p>
                              <h4>Task(s) Planned for Next Month：</h4> <p>   ${TaskPlanNextMonth} </p>
                              <h4>Notes/Comments：</h4> <p>  ${NotesOrComments} </p><br/>
                          </body>
                        </html>`;    
  
      var outputSpeech =  `Progress Report:
                          Student Name: ${userName}.
                          Project Name: ${ProjectName}.
                          Reporting Date: ${currentDate}.
                          Task(s) Planned for the Month and next 15 days: ${TaskPlan15Days}.
                          Problem or Challenges you faced and had to manage：${ProblemOrChallenges}.
                          Lesson(s) Learned： ${LessonsLearned}.
                          Task(s) Planned for Next Month： ${TaskPlanNextMonth}.
                          Notes or Comments ${NotesOrComments}. `;   
            AWS.config.update({
                accessKeyId: 'AKIAI7LW4FA6F65TUXQQ',
                secretAccessKey: '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',
                region: 'us-east-1'
              });
    
            var htmlBody= emailBody;    
            var textBody = `
              Hi ,
              ...
            `;

          const params = {
          Destination: {
            ToAddresses: ['uwalexacoop@gmail.com']
            //ToAddresses: [recipient]
          },
          Message: {
            Body: {
              Html: {
                Charset: "UTF-8",
                Data: htmlBody
              },
              Text: {
                Charset: "UTF-8",
                Data: textBody
              }
            },
            Subject: {
              Charset: "UTF-8",
              Data: 'UWATERLOO DATA'
            }
          },
          Source: `Conrad Progress Report from xuan <x34ren@edu.uwaterloo.ca>`
          //Source: 'Email from Xuan <'+recipient+'>'
        };
      //SES means simple email service. It is the sending email api offered by Amazon Web Service
      const sendPromise = new AWS.SES({ apiVersion: "2010-12-01" })
                              .sendEmail(params)
                              .promise();
      sendPromise.then(data => {
                console.log(data.MessageId);
                context.done(null, "Success");
              }).catch(err => {
                console.error(err, err.stack);
                context.done(null, "Failed");
              });
    }
    initial();
            return handlerInput.responseBuilder
                .speak(outputSpeech)
                .reprompt('ghjgjhgjhghj')
                .getResponse();
        }
    },
  };

  const ProgressReport = {
    canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      return request.type === 'IntentRequest' 
        && request.intent.name === 'ProgressReport'
        && request.dialogState === 'COMPLETED';
    },
    handle(handlerInput) {
      return handlerInput.responseBuilder
        .speak('huhuhu')
        .reprompt('klkklkljjkljkl')
        .getResponse();
    },
  };

  const GetEmail = {
    canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      return request.type === 'IntentRequest' 
        && request.intent.name === 'GetEmail'
    },
    handle(handlerInput) {
        const currentDate = getTodaysDate();
        if(send) {
            var emailBody =  `<html>
                          <head><b>Progress Report</b></head>
                          <body> 
                              <p> <b>Student Name :</b> ${userName} </p>
                              <p> <b> Project Name:</b> ${ProjectName} </p>
                              <p> <b> Reporting Date:</b> ${currentDate} </p><br/>
                              <h4>Task(s) Planned for the Month and next 15 days：</h4> <p> ${TaskPlan15Days} </p>
                              <h4>Problem or Challenges you faced and had to manage：</h4> <p> ${ProblemOrChallenges}</p>
                              <h4>Lesson(s) Learned：</h4> <p>  ${LessonsLearned} </p>
                              <h4>Task(s) Planned for Next Month：</h4> <p>   ${TaskPlanNextMonth} </p>
                              <h4>Notes/Comments：</h4> <p>  ${NotesOrComments} </p><br/>
                          </body>
                        </html>`;    
  
      var outputSpeech =  `Progress Report:
                          Student Name: ${userName}.
                          Project Name: ${ProjectName}.
                          Reporting Date: ${currentDate}.
                          Task(s) Planned for the Month and next 15 days: ${TaskPlan15Days}.
                          Problem or Challenges you faced and had to manage：${ProblemOrChallenges}.
                          Lesson(s) Learned： ${LessonsLearned}.
                          Task(s) Planned for Next Month： ${TaskPlanNextMonth}.
                          Notes or Comments ${NotesOrComments}. `;   
            AWS.config.update({
                accessKeyId: 'AKIAI7LW4FA6F65TUXQQ',
                secretAccessKey: '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',
                region: 'us-east-1'
              });
    
            var htmlBody= emailBody;    
            var textBody = `
              Hi ,
              ...
            `;

          const params = {
          Destination: {
            ToAddresses: ['uwalexacoop@gmail.com']
            //ToAddresses: [recipient]
          },
          Message: {
            Body: {
              Html: {
                Charset: "UTF-8",
                Data: htmlBody
              },
              Text: {
                Charset: "UTF-8",
                Data: textBody
              }
            },
            Subject: {
              Charset: "UTF-8",
              Data: 'UWATERLOO DATA'
            }
          },
          Source: `Conrad Progress Report from ${profileName} <${profileEmail}>`
          //Source: 'Email from Xuan <'+recipient+'>'
        };
      //SES means simple email service. It is the sending email api offered by Amazon Web Service
      const sendPromise = new AWS.SES({ apiVersion: "2010-12-01" })
                              .sendEmail(params)
                              .promise();
      sendPromise.then(data => {
                console.log(data.MessageId);
                context.done(null, "Success");
              }).catch(err => {
                console.error(err, err.stack);
                context.done(null, "Failed");
              });
    }
    initial();
      return handlerInput.responseBuilder
        .speak('the data was sent')
        .reprompt('klkklkljjkljkl')
        .getResponse();
    },
  };




const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest' 
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('This is Conrad Progress Report Skill. You can say, start report.')
      .reprompt('You can say, start report.')
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Bye')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};


const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

/* HELPER FUNCTIONS */

function getTodaysDate(){
  
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();
    
    if(dd<10) {
        dd = '0'+dd;
    } 
    
    if(mm<10) {
        mm = '0'+mm;
    } 
    
    today = dd + '/' +  mm + '/' + yyyy;
    return today;
  }

  function initial(){
    ProjectName ='empty';
    ProblemOrChallenges ='empty';
    TaskPlan15Days ='empty';
    TaskPlanNextMonth ='empty';
    LessonsLearned ='empty';
    NotesOrComments ='empty';
    first =true;
    send = true;
  }
function getSlotValues(filledSlots) {
  const slotValues = {};

  console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);
  Object.keys(filledSlots).forEach((item) => {
    const name = filledSlots[item].name;

    if (filledSlots[item] &&
      filledSlots[item].resolutions &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
      switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
        case 'ER_SUCCESS_MATCH':
          slotValues[name] = {
            synonym: filledSlots[item].value,
            resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
            isValidated: true,
          };
          break;
        case 'ER_SUCCESS_NO_MATCH':
          slotValues[name] = {
            synonym: filledSlots[item].value,
            resolved: filledSlots[item].value,
            isValidated: false,
          };
          break;
        default:
          break;
      }
    } else {
      slotValues[name] = {
        synonym: filledSlots[item].value,
        resolved: filledSlots[item].value,
        isValidated: false,
      };
    }
  }, this);

  return slotValues;
}


const RequestLog = {
  process(handlerInput) {
    console.log(`REQUEST ENVELOPE = ${JSON.stringify(handlerInput.requestEnvelope)}`);
  },
};

const ResponseLog = {
  process(handlerInput) {
    console.log(`RESPONSE BUILDER = ${JSON.stringify(handlerInput)}`);
  },
};

/* CONSTANTS */

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    HelpHandler,
    ExitHandler,
    //ErrorHandler,
    SessionEndedRequestHandler,    
    InProgressProgressReport,
    ProgressReport,
    GetEmail
  )
  /*.addErrorHandlers(ErrorHandler)
  .withApiClient(new Alexa.DefaultApiClient())
  .lambda();*/
  .addRequestInterceptors(RequestLog)
  .addResponseInterceptors(ResponseLog)
  .addErrorHandlers(ErrorHandler)
  .withApiClient(new Alexa.DefaultApiClient())
  .lambda();