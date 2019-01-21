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
const helpWords = ['help'];
const summaryWords = ['summary'];
const restartWords = ['restart'];
const MORE_INFO_PHRASE = 'Anything else?';
const nextStepPhrases = ['nothing', 'nope', 'no', 'finish', 'next', 'continue', 'stop', 'that\'s it', 'skip'];

// TODO. make constants for questions.
const QUESTION_PROJECT_NAME = "";
const QUESTION_PLAN_SHORT = "";
const QUESTION_PROBLEM = "";
const QUESTION_LESSON = "";
//...

// Add a random hints at the beginning of start report
const hints = ['Did you know you can say help at any time for a list of commands?',
                    'Did you know you can say next at the end of any bullet point to move to the next question?',
                    'Did you know you can say restart to start your report all over?',
                    'Did you know you can ask for a summary of your current bullet points by saying summary?'];

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

        if (containsInterjetWords(content)) {
            if (content.includes(helpWords)) {
                return HelpHandler.handle(handlerInput);
            } else if (content.includes(summaryWords)) {
                return Summary.handle(handlerInput);
            } else if (content.includes(restartWords)) {
                return Restart.handle(handlerInput);
            }
        }

        switch (currentState) {
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

        safelyModifyResponse(content);

        if (currentState === STATE_CONFIRMATION) {
            console.log("confirmation state");
            currentState = STATE_SENDING;
            return handlerInput.responseBuilder
                .speak(speechResponse + " .is this alright? Say send email to send. Say restart to start over.")
                .reprompt('//')
                .getResponse();
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

// Special case because we do not ask for more than one bullet for name
function handleStateProjectName(content) {
    if (content !== undefined) {
        data.projectName = content;
        speechResponse = 'What are your task plans for the next fifteen days?';
        currentState = STATE_PLAN_SHORT;
    }
}

function handleStatePlanShort(content) {
    if (containsTerminationWord(content)) {
        content = content.substring(0, content.indexOf(TERMINATION_WORD));
        data.taskPlan15Days.push(content);
        speechResponse = 'What are your problems or challenges?';
        currentState = STATE_PROBLEM;
    } else if (shouldContinue(content)) {
        speechResponse = 'What are your problems or challenges?';
        currentState = STATE_PROBLEM;
    } else {
        speechResponse = MORE_INFO_PHRASE;
        if (content !== undefined) {
            data.taskPlan15Days.push(content);
        }
    }
}

function handleProblem(content) {
    if (containsTerminationWord(content)) {
        content = content.substring(0, content.indexOf(TERMINATION_WORD));
        data.problemOrChallenges.push(content);
        speechResponse = 'What are some lessons you\'ve learned?';
        currentState = STATE_LESSON;
    } else if (shouldContinue(content)) {
        speechResponse = 'What are some lessons you\'ve learned?';
        currentState = STATE_LESSON;
    } else {
        speechResponse = MORE_INFO_PHRASE;
        if (content !== undefined) {
            data.problemOrChallenges.push(content);
        }
    }
}

function handleLesson(content) {
    if (containsTerminationWord(content)) {
        content = content.substring(0, content.indexOf(TERMINATION_WORD));
        data.lessonsLearned.push(content);
        speechResponse = 'What are your tasks for the next month?';
        currentState = STATE_PLAN_LONG;
    } else if (shouldContinue(content)) {
        speechResponse = 'What are your tasks for the next month?';
        currentState = STATE_PLAN_LONG;
    } else {
        speechResponse = MORE_INFO_PHRASE;
        if (content !== undefined) {
            data.lessonsLearned.push(content);
        }
    }
}

function handleStatePlanLong(content) {
    if (containsTerminationWord(content)) {
        content = content.substring(0, content.indexOf(TERMINATION_WORD));
        data.taskPlanNextMonth.push(content);
        speechResponse = 'If you wish, please leave any notes or comments.';
        currentState = STATE_NOTES;
    } else if (shouldContinue(content)) {
        speechResponse = 'If you wish, please leave any notes or comments.';
        currentState = STATE_NOTES;
    } else {
        speechResponse = MORE_INFO_PHRASE;
        if (content !== undefined) {
            data.taskPlanNextMonth.push(content);
        }
    }
}

function handleNotes(content) {
    if (containsTerminationWord(content)) {
        content = content.substring(0, content.indexOf(TERMINATION_WORD));
        data.notes.push(content);
        speechResponse = generateConfirmationVoicePrompt();
        currentState = STATE_CONFIRMATION;
    } else if (shouldContinue(content)) {
        speechResponse = generateConfirmationVoicePrompt();
        currentState = STATE_CONFIRMATION;
    } else {
        speechResponse = MORE_INFO_PHRASE;
        if (content !== undefined) {
            data.notes.push(content);
        }
    }
}

function restateQuestion(state) {
    switch (state) {
        case STATE_INIT:
            return "no data to report at the moment";
        case STATE_PROJECT_NAME:
            return 'What is your project name?';
        case STATE_PLAN_SHORT:
            return 'What are your task plans for the next fifteen days?';
        case STATE_PROBLEM:
            return 'What are your problems or challenges?';
        case STATE_LESSON:
            return 'What are some lessons you\'ve learned?';
        case STATE_PLAN_LONG:
            return 'What are your tasks for the next month?';
        case STATE_NOTES:
            return 'If you wish, please leave any notes or comments.';
    }
}

function safelyModifyResponse(content) {
    // Case occurs when the program returns from a help or summary intent
    // We restate the question for clarity
    if (content === undefined) {
        speechResponse = restateQuestion(currentState);
    }
}

function containsTerminationWord(content) {
    return content !== undefined && content.includes(TERMINATION_WORD);
}

function shouldContinue(content) {
    return content !== undefined && nextStepPhrases.includes(content);
}

function containsInterjetWords(content) {
    return content !== undefined && (helpWords.includes(content) || summaryWords.includes(content) || restartWords.includes(content));
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

// TODO FIX THE SEND EMAIL CODE
const GetEmail = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'GetEmail';
    },
    handle(handlerInput) {
        console.log('get email intent fired');
        const currentDate = getTodaysDate();
        if (send) {
            updateAWSConfig();
            const sendPromise = queueSendEmail();
        }
        return handlerInput.responseBuilder
            .speak('sending data...')
            .reprompt('//')
            .getResponse();
    },
};

const Restart = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'Restart';
    },
    handle(handlerInput) {
        resetToInitialState();
        return handlerInput.responseBuilder
            .speak('We have restarted your report. Please say start report to start your report')
            .reprompt('//')
            .getResponse();
    },
};

const Summary = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'Summary';
    },
    handle(handlerInput) {
        let lastOutput = getData(currentState);

        let response = '';

        if (lastOutput = '') {
            response = "Sorry. You current do not have any bullet points for this section." +
                "Say continue report to continue your report";
        } else {
            response = "The response to your last question was: [" + lastOutput + "]. " +
                "Would you like to redo this question? If not, say continue report to continue your report.";
        }

        return handlerInput.responseBuilder
            .speak(response)
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
            .speak('You can say, Start Report to start your report or continue report to continue your report, ' +
                'Restart to restart your report, ' +
                'Skip to skip your question, ' +
                'Next if you have completed answering a question. ' +
                'Continue by saying continue report to resume your current question')
            .reprompt('//')
            .getResponse();
    },
};

const YesHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest'
            && request.intent.name === 'AMAZON.YesIntent';
    },
    handle(handlerInput) {
        clearData(currentState);
        return handlerInput.responseBuilder
            .speak('Restarting Question... Say continue report to keep reporting')
            .reprompt('//')
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
            <p> <b> Project Name:</b> ${data.projectName} </p>
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
    });
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

// unused function at the moment
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

function getData(state) {
    switch (state) {
        case STATE_INIT:
            return "no data to report at the moment";
        case STATE_PROJECT_NAME:
            return convertBulletPointsToText(data.projectName);
        case STATE_PLAN_SHORT:
            return convertBulletPointsToText(data.taskPlan15Days);
        case STATE_PROBLEM:
            return convertBulletPointsToText(data.problemOrChallenges);
        case STATE_LESSON:
            return convertBulletPointsToText(data.lessonsLearned);
        case STATE_PLAN_LONG:
            return convertBulletPointsToText(data.taskPlanNextMonth);
        case STATE_NOTES:
            return convertBulletPointsToText(data.notes);
    }
}

function clearData(state) {
    switch (state) {
        case STATE_INIT:
            break;
        case STATE_PROJECT_NAME:
            data.projectName = '';
            break;
        case STATE_PLAN_SHORT:
            data.taskPlan15Days = [];
            break;
        case STATE_PROBLEM:
            data.problemOrChallenges = [];
            break;
        case STATE_LESSON:
            data.lessonsLearned = [];
            break;
        case STATE_PLAN_LONG:
            data.taskPlanNextMonth = [];
            break;
        case STATE_NOTES:
            data.notes = [];
            break;
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
        Restart,
        YesHandler
    )
    /*.addErrorHandlers(ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();*/
    .addRequestInterceptors(RequestLog)
    .addResponseInterceptors(ResponseLog)
    .addErrorHandlers(ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();
