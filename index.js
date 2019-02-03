//require ask-sdk-core node module.
const Alexa = require('ask-sdk-core');
const AWS = require("aws-sdk");
const APP_NAME = "Conrad Progress Report Skill";

//require other modules
const aws_credentials = require('./credentials');
const resources = require('./resources');
const emailClient = require('./email-client');
AWS.config.update({region: 'us-east-1'});

// user state
let userName = '';
let userEmail = '';

let currentState = resources.STATE_INIT;

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
            const speechResponse = `Hello, ${profileName}. ` + resources.prompts.start + ' ' + getRandomHint();

            return responseBuilder
                .speak(speechResponse)
                .reprompt(`Please say "start report" to get started.`)
                .withSimpleCard(APP_NAME, speechResponse)
                .getResponse();
        } catch (error) {
            console.log(JSON.stringify(error));
            if (error.statusCode == 403) {
                return responseBuilder
                    .speak(resources.messages.NOTIFY_MISSING_PERMISSIONS)
                    .withAskForPermissionsConsentCard([resources.FULL_NAME_PERMISSION])
                    .getResponse();
            }
            console.log(JSON.stringify(error));
            const response = responseBuilder.speak(resources.messages.ERROR).getResponse();
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
            if (content.includes(resources.helpWords)) {
                return HelpHandler.handle(handlerInput);
            } else if (content.includes(resources.summaryWords)) {
                return Summary.handle(handlerInput);
            } else if (content.includes(resources.restartWords)) {
                return Restart.handle(handlerInput);
            }
        }

        switch (currentState) {
            case resources.STATE_INIT:
                handleStateInit();
                break;
            case resources.STATE_PROJECT_NAME:
                handleStateProjectName(content);
                break;
            case resources.STATE_PLAN_SHORT:
                handleStatePlanShort(content);
                break;
            case resources.STATE_PROBLEM:
                handleProblem(content);
                break;
            case resources.STATE_LESSON:
                handleLesson(content);
                break;
            case resources.STATE_PLAN_LONG:
                handleStatePlanLong(content);
                break;
            case resources.STATE_NOTES:
                handleNotes(content);
                break;
        }

        safelyModifyResponse(content);

        if (currentState === resources.STATE_CONFIRMATION) {
            console.log("confirmation state");
            currentState = resources.STATE_SENDING;
            return handlerInput.responseBuilder
                .speak(speechResponse + resources.prompts.confirmation)
                .reprompt('//')
                .getResponse();
        } else {
            return handlerInput.responseBuilder
                .speak(speechResponse)
                .reprompt('//')
                .addElicitSlotDirective('content')
                .getResponse();
        }
    },
};

// helpers for the progress intent

function handleStateInit() {
    speechResponse = resources.question.project_name;
    currentState = resources.STATE_PROJECT_NAME;
}

// Special case because we do not ask for more than one bullet for name
function handleStateProjectName(content) {
    if (content !== undefined) {
        data.projectName = content;
        speechResponse = resources.question.plan_short;
        currentState = resources.STATE_PLAN_SHORT;
    }
}

function handleStatePlanShort(content) {
    if (containsTerminationWord(content)) {
        content = content.substring(0, content.indexOf(resources.TERMINATION_WORD));
        data.taskPlan15Days.push(content);
        speechResponse = resources.question.problem;
        currentState = resources.STATE_PROBLEM;
    } else if (shouldContinue(content)) {
        speechResponse = resources.question.problem;
        currentState = resources.STATE_PROBLEM;
    } else {
        speechResponse = resources.MORE_INFO_PHRASE;
        if (content !== undefined) {
            data.taskPlan15Days.push(content);
        }
    }
}

function handleProblem(content) {
    if (containsTerminationWord(content)) {
        content = content.substring(0, content.indexOf(resources.TERMINATION_WORD));
        data.problemOrChallenges.push(content);
        speechResponse = resources.question.lesson;
        currentState = resources.STATE_LESSON;
    } else if (shouldContinue(content)) {
        speechResponse = resources.question.lesson;
        currentState = resources.STATE_LESSON;
    } else {
        speechResponse = resources.MORE_INFO_PHRASE;
        if (content !== undefined) {
            data.problemOrChallenges.push(content);
        }
    }
}

function handleLesson(content) {
    if (containsTerminationWord(content)) {
        content = content.substring(0, content.indexOf(resources.TERMINATION_WORD));
        data.lessonsLearned.push(content);
        speechResponse = resources.question.plan_long;
        currentState = resources.STATE_PLAN_LONG;
    } else if (shouldContinue(content)) {
        speechResponse = resources.question.plan_long;
        currentState = resources.STATE_PLAN_LONG;
    } else {
        speechResponse = resources.MORE_INFO_PHRASE;
        if (content !== undefined) {
            data.lessonsLearned.push(content);
        }
    }
}

function handleStatePlanLong(content) {
    if (containsTerminationWord(content)) {
        content = content.substring(0, content.indexOf(resources.TERMINATION_WORD));
        data.taskPlanNextMonth.push(content);
        speechResponse = resources.question.notes;
        currentState = resources.STATE_NOTES;
    } else if (shouldContinue(content)) {
        speechResponse = resources.question.notes;
        currentState = resources.STATE_NOTES;
    } else {
        speechResponse = resources.MORE_INFO_PHRASE;
        if (content !== undefined) {
            data.taskPlanNextMonth.push(content);
        }
    }
}

function handleNotes(content) {
    if (containsTerminationWord(content)) {
        content = content.substring(0, content.indexOf(resources.TERMINATION_WORD));
        data.notes.push(content);
        speechResponse = emailClient.generateConfirmationVoicePrompt(userName, data);
        currentState = resources.STATE_CONFIRMATION;
    } else if (shouldContinue(content)) {
        speechResponse = emailClient.generateConfirmationVoicePrompt(userName, data);
        currentState = resources.STATE_CONFIRMATION;
    } else {
        speechResponse = resources.MORE_INFO_PHRASE;
        if (content !== undefined) {
            data.notes.push(content);
        }
    }
}

function restateQuestion(state) {
    switch (state) {
        case resources.STATE_INIT:
            return resources.question.init;
        case resources.STATE_PROJECT_NAME:
            return resources.question.project_name;
        case resources.STATE_PLAN_SHORT:
            return resources.question.plan_short;
        case resources.STATE_PROBLEM:
            return resources.question.problem;
        case resources.STATE_LESSON:
            return resources.question.lesson;
        case resources.STATE_PLAN_LONG:
            return resources.question.plan_long;
        case resources.STATE_NOTES:
            return resources.question.notes;
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
    return content !== undefined && content.includes(resources.TERMINATION_WORD);
}

function shouldContinue(content) {
    return content !== undefined && resources.nextStepPhrases.includes(content);
}

function containsInterjetWords(content) {
    return content !== undefined && (resources.helpWords.includes(content) || resources.summaryWords.includes(content) || resources.restartWords.includes(content));
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
        if (send) {
            updateAWSConfig();
            const sendPromise = new AWS.SES({apiVersion: '2010-12-01'}).sendEmail(emailClient.generateParams(userName, data)).promise();
            sendPromise.then(
              function(data) {
                console.log(data.MessageId);
                resetToInitialState();
              }).catch(
                function(err) {
                console.error(err, err.stack);
              });
        }
        return handlerInput.responseBuilder
            .speak('Data has been sent. Thank you.')
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
            .speak(resources.prompts.post_restart_report)
            .reprompt('//')
            .getResponse();
    },
};

const RestartQuestion = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'RestartQuestion';
    },
    handle(handlerInput) {
        return YesHandler.handle(handlerInput);
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
            response = resources.prompts.no_bullets;
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
            .speak(resources.prompts.help)
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
            .speak(resources.prompts.post_restart_question)
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

/* HELPER FUNCTIONS */

function getRandomHint() {
    return resources.hints[Math.floor(Math.random() * resources.hints.length)];
}

function convertBulletPointsToText(bullets) {
    let text = "";
    bullets.forEach(bullet => {
        text += bullet + ". ";
    });
    return text;
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

function resetToInitialState() {
    currentState = resources.STATE_INIT;
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
        case resources.STATE_INIT:
            return resources.question.init;
        case resources.STATE_PROJECT_NAME:
            return convertBulletPointsToText(data.projectName);
        case resources.STATE_PLAN_SHORT:
            return convertBulletPointsToText(data.taskPlan15Days);
        case resources.STATE_PROBLEM:
            return convertBulletPointsToText(data.problemOrChallenges);
        case resources.STATE_LESSON:
            return convertBulletPointsToText(data.lessonsLearned);
        case resources.STATE_PLAN_LONG:
            return convertBulletPointsToText(data.taskPlanNextMonth);
        case resources.STATE_NOTES:
            return convertBulletPointsToText(data.notes);
    }
}

function clearData(state) {
    switch (state) {
        case resources.STATE_INIT:
            break;
        case resources.STATE_PROJECT_NAME:
            data.projectName = '';
            break;
        case resources.STATE_PLAN_SHORT:
            data.taskPlan15Days = [];
            break;
        case resources.STATE_PROBLEM:
            data.problemOrChallenges = [];
            break;
        case resources.STATE_LESSON:
            data.lessonsLearned = [];
            break;
        case resources.STATE_PLAN_LONG:
            data.taskPlanNextMonth = [];
            break;
        case resources.STATE_NOTES:
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
        YesHandler,
        RestartQuestion
    )
    /*.addErrorHandlers(ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();*/
    .addRequestInterceptors(RequestLog)
    .addResponseInterceptors(ResponseLog)
    .addErrorHandlers(ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();
