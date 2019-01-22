// TODO put constants in here

exports.messages = {
    NOTIFY_MISSING_PERMISSIONS: 'Please enable profile permissions in the Amazon Alexa app.',
    ERROR: 'Uh Oh. Looks like something went wrong.'
};
exports.FULL_NAME_PERMISSION = "alexa::profile:name:read";
exports.EMAIL_PERMISSION = "alexa::profile:email:read";

exports.TERMINATION_WORD = 'next';
exports.helpWords = ['help'];
exports.summaryWords = ['summary'];
exports.restartWords = ['restart'];
exports.MORE_INFO_PHRASE = 'Anything else?';
exports.nextStepPhrases = ['nothing', 'nope', 'no', 'finish', 'next', 'continue', 'stop', 'that\'s it', 'skip'];

// TODO. make constants for questions.
const QUESTION_PROJECT_NAME = "";
const QUESTION_PLAN_SHORT = "";
const QUESTION_PROBLEM = "";
const QUESTION_LESSON = "";
//...

// Add a random hints at the beginning of start report
exports.hints = ['Did you know you can say help at any time for a list of commands?',
                    'Did you know you can say next at the end of any bullet point to move to the next question?',
                    'Did you know you can say restart to start your report all over?',
                    'Did you know you can ask for a summary of your current bullet points by saying summary?'];


// progress states
exports.NUM_STATES = 8;
exports.states = {
    STATE_INIT : 0,
    STATE_PROJECT_NAME : 1,
    STATE_PLAN_SHORT : 2,
    STATE_PROBLEM : 3,
    STATE_LESSON : 4,
    STATE_PLAN_LONG : 5,
    STATE_NOTES : 6,
    STATE_CONFIRMATION : 7,
    STATE_SENDING : 8
}

