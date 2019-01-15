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
const TERMINATION_WORD = 'finish';

// user state
let userName = '';
let userEmail = '';

// content for email
let projectName = EMPTY_STATE;
let problemOrChallenges = EMPTY_STATE;
let taskPlan15Days = EMPTY_STATE;
let taskPlanNextMonth = EMPTY_STATE;
let lessonsLearned = EMPTY_STATE;
let notes = EMPTY_STATE;

// variable state
let first = true;
let send = true;
let tempContent = '';
let speechResponse = '';

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

        if (projectName === EMPTY_STATE) {
            if (!first) {
                projectName = content;
                speechResponse = 'What are your task plans for the next fifteen days?';
            } else {
                speechResponse = 'What is your project name?';
            }
            first = false;
        } else if (taskPlan15Days === EMPTY_STATE) {
            tempContent += content;
            if (tempContent.includes('finish')) {
                tempContent = tempContent.substring(0, tempContent.indexOf('finish'));
                if (containsKeyWordsToProceed(tempContent)) {
                    taskPlan15Days = tempContent;
                    speechResponse = 'What are your problems or challenges?';
                    tempContent = '';
                } else {
                    tempContent = '';
                    speechResponse = 'Please answer something related to ...';
                }
            } else {
                speechResponse = 'What else ?';
            }
        } else if (problemOrChallenges === EMPTY_STATE) {
            tempContent += content;
            if (content.includes('finish')) {
                tempContent = tempContent.substring(0, tempContent.indexOf('finish'));
                if (containsKeyWordsToProceed(tempContent)) {
                    problemOrChallenges = tempContent;
                    speechResponse = 'What are some lessons you\'ve Learned?';
                    tempContent = '';
                } else {
                    tempContent = '';
                    speechResponse = 'Please answer something related to ...';
                }
            } else {
                speechResponse = 'What else?';
            }
        } else if (lessonsLearned === EMPTY_STATE) {
            tempContent += content;
            if (content.includes('finish')) {
                tempContent = tempContent.substring(0, tempContent.indexOf('finish'));
                if (containsKeyWordsToProceed(tempContent)) {
                    lessonsLearned = tempContent;
                    speechResponse = 'What are your tasks for the next month?';
                    tempContent = '';
                } else {
                    tempContent = '';
                    speechResponse = 'Please answer something related to .....';
                }
            } else {
                speechResponse = 'What else ?';
            }
        } else if (taskPlanNextMonth === EMPTY_STATE) {
            tempContent += content;
            if (content.includes('finish')) {
                tempContent = tempContent.substring(0, tempContent.indexOf('finish'));
                if (containsKeyWordsToProceed(tempContent)) {
                    taskPlanNextMonth = tempContent;
                    speechResponse = 'If you wish, please leave any notes or comments.';
                    tempContent = '';
                } else {
                    tempContent = '';
                    speechResponse = 'Please answer something related to .....';
                }
            } else {
                speechResponse = 'What else?';
            }
        } else if (notes === EMPTY_STATE) {
            tempContent += content;
            if (content.includes('finish')) {
                tempContent = tempContent.substring(0, tempContent.indexOf('finish'));
                if (containsKeyWordsToProceed(tempContent)) {
                    notes = tempContent;
                    speechResponse = generateConfirmationVoicePrompt();
                    tempContent = '';
                } else {
                    tempContent = '';
                    speechResponse = 'Please answer something related to .....';
                }
            } else {
                speechResponse = 'What else ?';
            }
        }
        if (notes === EMPTY_STATE) {
            return handlerInput.responseBuilder
                .speak(speechResponse)
                .reprompt('//')
                .addElicitSlotDirective('content')
                .getResponse();
        } else {
            const currentDate = getTodaysDate();
            if (send) {
                updateAWSConfig();
                const sendPromise = queueSendEmail();
            }
            return handlerInput.responseBuilder
                .speak(generateConfirmationVoicePrompt())
                .reprompt('placeholder blank reprompt')
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

/* HTML and markdown formatting functions */

function generateConfirmationVoicePrompt() {
    return `Progress Report:
    Student Name: ${userName}.
    Project Name: ${projectName}.
    Reporting Date: ${getTodaysDate()}.
    Task(s) Planned for the Month and next 15 days: ${taskPlan15Days}.
    Problem or Challenges you faced and had to manage：${problemOrChallenges}.
    Lesson(s) Learned： ${lessonsLearned}.
    Task(s) Planned for Next Month： ${taskPlanNextMonth}.
    Notes or Comments ${notes}. `;
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
            <p> <b> Project Name:</b> ${projectName} </p>
            <p> <b> Reporting Date:</b> ${getTodaysDate()} </p><br/>
            <h4>Task(s) Planned for the Month and next 15 days：</h4> <p> ${taskPlan15Days} </p>
            <h4>Problem or Challenges you faced and had to manage：</h4> <p> ${problemOrChallenges}</p>
            <h4>Lesson(s) Learned：</h4> <p>  ${lessonsLearned} </p>
            <h4>Task(s) Planned for Next Month：</h4> <p>   ${taskPlanNextMonth} </p>
            <h4>Notes/Comments：</h4> <p>  ${notes} </p><br/>
        </body>
    </html>`;

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
    projectName = EMPTY_STATE;
    problemOrChallenges = EMPTY_STATE;
    taskPlan15Days = EMPTY_STATE;
    taskPlanNextMonth = EMPTY_STATE;
    lessonsLearned = EMPTY_STATE;
    notes = EMPTY_STATE;
    first = true;
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
