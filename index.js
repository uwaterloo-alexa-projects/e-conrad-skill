//require ask-sdk-core node module.
const Alexa = require('ask-sdk-core');
const AWS = require("aws-sdk");
const APP_NAME = "Conrad Progress Report Skill";

//require other modules
const aws_credentials = require('./credentials');

// constant strings
const messages = {
    NOTIFY_MISSING_PERMISSIONS: 'Please enable profile permissions in the Amazon Alexa app.',
    ERROR: 'Uh Oh. Looks like something went wrong.'
};
const FULL_NAME_PERMISSION = "alexa::profile:name:read";
const EMAIL_PERMISSION = "alexa::profile:email:read";

const EMPTY_STATE = 'empty';
// used to move on to next step
const TERMINATION_WORD = 'next';
const MORE_INFO_PHRASE = 'Anything else?';
const nextStepPhrases = ['nothing', 'nope', 'no', 'finish', 'next', 'continue', 'stop', 'that\'s it'];

// user state
let userName = '';
let userEmail = '';

// progress states
const NUM_STATES = 8;
const STATE_INIT = 0;
const STATE_PROJECT_NAME = 1;
const STATE_PLAN_SHORT = 2;
const STATE_PROBLEM = 3;
const STATE_LESSON = 4;
const STATE_PLAN_LONG = 5;
const STATE_NOTES = 6;
const STATE_CONFIRMATION = 7;
const STATE_SENDING = 8;

let currentState = STATE_INIT;

// content for email
let data = {};

// variable state
let first = true;
let send = true;
let tempContent = '';
let speechResponse = '';

<<<<<<< HEAD
class State {
    STATE_PROJECT_NAME = 0;
    STATE_PLAN_SHORT = 1;
    STATE_PROBLEM = 2;
    STATE_LESSON = 3;
    STATE_PLAN_LONG = 4;
    STATE_NOTES = 5;
    STATE_CONFIRMATION = 6;
}
=======

>>>>>>> 6469099d202aee893ccef4e77f2a56527e138ef6
/* INTENT HANDLERS */

//when you invoke your skill, you will trigger this handler
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async handle(handlerInput) {
        resetToInitialState();
        const {serviceClientFactory, responseBuilder} = handlerInput;
        try {
            const upsServiceClient = serviceClientFactory.getUpsServiceClient();
            const profileName = await upsServiceClient.getProfileName();
            console.log(profileName + 'test2');
            const profileEmail = await upsServiceClient.getProfileEmail();
            console.log(profileEmail + 'test2');
            userName += profileName;
            userEmail += profileEmail;
            const speechResponse = `Hello, ${profileName}. Welcome to the Conrad Reporting Skill. Please say "start report" to get started.`;

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
            && request.dialogState !== 'COMPLETED';  //&& request.dialogState !== 'COMPLETED'; means you have not finished the conversation
    },
    handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const slotvalues_notresolved = getSlotValues(filledSlots);
        const content = slotvalues_notresolved.content.resolved;

        switch(currentState) {
            case STATE_INIT:
                handleStateInit();
                break;
            case STATE_PROJECT_NAME:
                handleStateProjectName(content);
                break;
            case STATE_PLAN_SHORT:
                handleStatePlanShort(content);
                break;
            case STATE_PROBLEM:
                handleProblem(content);
                break;
            case STATE_LESSON:
                handleLesson(content);
                break;
            case STATE_PLAN_LONG:
                handleStatePlanLong(content);
                break;
            case STATE_NOTES:
                handleNotes(content);
                break;
        }

        if (currentState == STATE_CONFIRMATION) {
            currentState = STATE_SENDING;
            return handlerInput.responseBuilder
                .speak(speechResponse + " .is this alright? Say send to send. Say restart to start over.")
                .reprompt('is this alright? Say send to send. Say restart to start over')
                .addElicitSlotDirective('content')
                .getResponse();
        } else if (currentState == STATE_SENDING) {
            return handlerInput.responseBuilder
                .speak("sending email...");
            // SEND EMAIL CODE
        } else {
            return handlerInput.responseBuilder
                .speak(speechResponse)
                .reprompt('//')
                .addElicitSlotDirective('content')
                .getResponse();
            // const currentDate = getTodaysDate();
            // if (send) {
            //     updateAWSConfig();
            //     const sendPromise = queueSendEmail();
            // }
            // return handlerInput.responseBuilder
            //     .speak(generateConfirmationVoicePrompt())
            //     .reprompt('is this alright?')
            //     .getResponse();
        }
    },
};

// helpers for the progress intent

function handleStateInit() {
    speechResponse = 'What is your project name?';            
    currentState = STATE_PROJECT_NAME;
}

function handleStateProjectName(content) {
    data.projectName = content;
    speechResponse = 'What are your task plans for the next fifteen days?';            
    currentState = STATE_PLAN_SHORT;
}

function handleStatePlanShort(content) {
    if (content.includes(TERMINATION_WORD)) {
        content = content.substring(0, content.indexOf(TERMINATION_WORD));
        data.taskPlan15Days.push(content);
        speechResponse = 'What are your problems or challenges?';
        currentState = STATE_PROBLEM;
    } else if (shouldContinue(content)) {
        speechResponse = 'What are your problems or challenges?';
        currentState = STATE_PROBLEM;
    } else {
        speechResponse = MORE_INFO_PHRASE;
        data.taskPlan15Days.push(content);
    }
}

function handleProblem(content) {
    if (content.includes(TERMINATION_WORD)) {
        content = content.substring(0, content.indexOf(TERMINATION_WORD));
        data.problemOrChallenges.push(content);
        speechResponse = 'What are some lessons you\'ve Learned?';
        currentState = STATE_LESSON;
    } else if (shouldContinue(content)) {
        speechResponse = 'What are some lessons you\'ve Learned?';
        currentState = STATE_LESSON;
    } else {
        speechResponse = MORE_INFO_PHRASE;
        data.problemOrChallenges.push(content);
    }
}

function handleLesson(content) {
    if (content.includes(TERMINATION_WORD)) {
        content = content.substring(0, content.indexOf(TERMINATION_WORD));
        data.lessonsLearned.push(content);
        speechResponse = 'What are your tasks for the next month?';
        currentState = STATE_PLAN_LONG;
    } else if (shouldContinue(content)) {
        speechResponse = 'What are your tasks for the next month?';
        currentState = STATE_PLAN_LONG;
    } else {
        speechResponse = MORE_INFO_PHRASE;
        data.lessonsLearned.push(content);
    }
}

function handleStatePlanLong(content) {
    if (content.includes(TERMINATION_WORD)) {
        content = content.substring(0, content.indexOf(TERMINATION_WORD));
        data.taskPlanNextMonth.push(content);
        speechResponse = 'If you wish, please leave any notes or comments.';
        currentState = STATE_NOTES;
    } else if (shouldContinue(content)) {
        speechResponse = 'If you wish, please leave any notes or comments.';
        currentState = STATE_NOTES;
    } else {
        speechResponse = MORE_INFO_PHRASE;
        data.taskPlanNextMonth.push(content);
    }
}

function handleNotes(content) {
    if (content.includes(TERMINATION_WORD)) {
        content = content.substring(0, content.indexOf(TERMINATION_WORD));
        data.notes.push(content);
        speechResponse = generateConfirmationVoicePrompt();
        currentState = STATE_CONFIRMATION;
    } else if (shouldContinue(content)) {
        speechResponse = generateConfirmationVoicePrompt();
        currentState = STATE_CONFIRMATION;
    } else {
        speechResponse = MORE_INFO_PHRASE;
        data.notes.push(content);
    }
}

function shouldContinue(content) {
    return nextStepPhrases.includes(content);
}

// end of helpers for progress intent

const ProgressReport = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'ProgressReport'
            && request.dialogState === 'COMPLETED';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('//')
            .reprompt('//')
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
        if (send) {
            updateAWSConfig();
            const sendPromise = queueSendEmail();
        }
        return handlerInput.responseBuilder
            .speak('the data was sent')
            .reprompt('//')
            .getResponse();
    },
};

const Skip = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'AMAZON.Skip';
    },
    handle(handlerInput) {
        currentState += 1;
        return handlerInput.responseBuilder
            .speak('Question was skipped');
        return InProgressProgressReport.handle(handlerInput);
    },
};

const Restart = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'AMAZON.Restart';
    },
    handle(handlerInput) {
        resetToInitialState();
        return handlerInput.responseBuilder
            .speak('Restarting report...');
        return InProgressProgressReport.handle(handlerInput);
    },
};

const Summary = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'AMAZON.Summary';
    },
    handle(handlerInput) {
      const state -= currentState;
      return handlerInput.responseBuilder
        .speak('The response to your last question was' + getData(state)
              + '');
        .addElicitSlotDirective('confirm');

          if (confirm == "yes"){
            currentState -=1;
            return InProgressProgressReport.handle(handlerInput);

          }else {
            return handlerInput.responseBuilder
              .speak("Continuing Report...");
            return InProgressProgressReport.handle(handlerInput);
          }

        };

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
            .speak('This is Conrad Progress Report Skill.
                    You can say, Start Report to start your report,
                    Restart to restart your report,
                    Skip to skip your question
                    ')
            .reprompt('Say help again to iterate the options')
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


    },
};

/* HTML and markdown formatting functions */

function convertBulletPointsToText(bullets) {
    let text = "";
    bullets.forEach(bullet => {
        text += bullet + ". ";
    });
    return text;
}

function generateConfirmationVoicePrompt() {

    return `Progress Report:
    Student Name: ${userName}.
    Project Name: ${data.projectName}.
    Reporting Date: ${getTodaysDate()}.
    Task(s) Planned for the Month and next 15 days: ${convertBulletPointsToText(data.taskPlan15Days)}.
    Problem or Challenges you faced and had to manage：${convertBulletPointsToText(data.problemOrChallenges)}.
    Lesson(s) Learned： ${convertBulletPointsToText(data.lessonsLearned)}.
    Task(s) Planned for Next Month： ${convertBulletPointsToText(data.taskPlanNextMonth)}.
    Notes or Comments ${convertBulletPointsToText(data.notes)}. `;
}

function generateParams() {
    return {
        Destination: {
            ToAddresses: ['uwalexacoop@gmail.com']
            //ToAddresses: [recipient]
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: generateEmailHtmlBody()
                },
                Text: {
                    Charset: "UTF-8",
                    Data: generateEmailTextBody()
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
}

function generateEmailHtmlBody() {
    return `<html>
        <head><b>Progress Report</b></head>
        <body>
            <p> <b>Student Name :</b> ${userName} </p>
            <p> <b> Project Name:</b> ${convertBulletPointsToText(data.projectName)} </p>
            <p> <b> Reporting Date:</b> ${getTodaysDate()} </p><br/>
            <h4>Task(s) Planned for the Month and next 15 days：</h4> <p> ${convertBulletPointsToText(data.taskPlan15Days)} </p>
            <h4>Problem or Challenges you faced and had to manage：</h4> <p> ${convertBulletPointsToText(data.problemOrChallenges)}</p>
            <h4>Lesson(s) Learned：</h4> <p>  ${convertBulletPointsToText(data.lessonsLearned)} </p>
            <h4>Task(s) Planned for Next Month：</h4> <p>   ${convertBulletPointsToText(data.taskPlanNextMonth)} </p>
            <h4>Notes/Comments：</h4> <p>  ${convertBulletPointsToText(data.notes)} </p><br/>
        </body>
    </html>`;

}

function convertBulletPointsToText(bullets) {
    let text = "";
    bullets.forEach(bullet => {
        text += bullet + ". ";
    })
    return text;
}

function generateEmailTextBody() {
    return `
              Hi ,
              ...
            `;
}

/* HELPER FUNCTIONS */

function queueSendEmail() {
    //SES means simple email service. It is the sending email api offered by Amazon Web Service
    //TODO change to Gmail API
    return new AWS.SES({apiVersion: "2010-12-01"})
        .sendEmail(generateParams())
        .promise()
        .then(data => {
            console.log(data.MessageId);
            resetToInitialState();
            context.done(null, "Success");
        }).catch(err => {
            console.error(err, err.stack);
            resetToInitialState();
            context.done(null, "Failed");
        });
}

function updateAWSConfig() {
    // TODO remove these secret access keys and access keys from github
    AWS.config.update(aws_credentials.AWS_CONFIG);
}

function containsKeyWordsToProceed(tempContent) {
    return tempContent.includes('course') || tempContent.includes('term goal') || tempContent.includes('action plan') ||
        tempContent.includes('objective') || tempContent.includes('milestone') || tempContent.includes('event')
        || tempContent.includes('mentor') || tempContent.includes('advisor') || tempContent.includes('brief');
}

function getTodaysDate() {

    let today = new Date();
    let dd = today.getDate();
    let mm = today.getMonth() + 1; //January is 0!
    let yyyy = today.getFullYear();

    if (dd < 10) {
        dd = '0' + dd;
    }

    if (mm < 10) {
        mm = '0' + mm;
    }

    today = dd + '/' + mm + '/' + yyyy;
    return today;
}

function resetToInitialState() {
    currentState = STATE_INIT;
    data.projectName = "";
    data.problemOrChallenges = [];
    data.taskPlan15Days = [];
    data.taskPlanNextMonth = [];
    data.lessonsLearned = [];
    data.notes = [];
    first = true;
    send = true;
}

function getData(state){
  switch(state) {

  case 0:
    return data.projectName;
    break;

  case 1:
    return convertBulletPointsToText(data.taskPlan15Days);
    break;

  case 2:
    return convertBulletPointsToText(data.problemOrChallenges);
    break;

  case 3:
    return convertBulletPointsToText(data.lessonsLearned);
    break;

  case 4:
    return convertBulletPointsToText(data.taskPlanNextMonth);
    break;

  case 5:
    return convertBulletPointsToText(data.notes);
    break;

  default:
    console.log('Not Valid State');
}
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
        GetEmail,
        Summary,
        Skip,
        Restart
    )
    /*.addErrorHandlers(ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();*/
    .addRequestInterceptors(RequestLog)
    .addResponseInterceptors(ResponseLog)
    .addErrorHandlers(ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();
