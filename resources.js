// TODO put constants in here

exports.messages = {
    NOTIFY_MISSING_PERMISSIONS: 'Please enable profile permissions in the Amazon Alexa app.',
    ERROR: 'Uh Oh. Looks like something went wrong.'
};
exports.FULL_NAME_PERMISSION = "alexa::profile:name:read";
exports.EMAIL_PERMISSION = "alexa::profile:email:read";

exports.TERMINATION_WORD = 'next';
exports.helpWords = ['help'];
exports.summaryWords = ['summarize'];
exports.restartWords = ['restart'];
exports.MORE_INFO_PHRASE = 'Anything else?';
exports.nextStepPhrases = ['nothing', 'nope', 'no', 'finish', 'next', 'continue', 'stop', 'that\'s it', 'skip'];

exports.prompts = {
    post_restart_report : 'We have restarted your report. Please say start report to start your report',
    post_restart_question : 'Restarting Question... Say continue report to keep reporting',
    no_bullets : "Sorry. You current do not have any bullet points for this section. Say continue report to continue your report",
    help : 'You can say, Start Report to start your report or continue report to continue your report, ' +
            'Restart to restart your report, ' +
            'Skip to skip your question, ' +
            'Next if you have completed answering a question. ' +
            'Continue by saying continue report to resume your current question',
    start : 'Welcome to the Conrad Reporting Skill. Please say "start report" to get started.',
    confirmation : ' .is this alright? Say send email to send. Say restart to start over.'
}

exports.question = {
    init : 'no data to report at the moment',
    project_name : 'What is your project name?',
    plan_short : 'What are your task plans for the next fifteen days?',
    problem : 'What are your problems or challenges?',
    lesson : 'What are some lessons you\'ve learned?',
    plan_long : 'What are your tasks for the next month?',
    notes : 'If you wish, please leave any notes or comments.'
}

// Add a random hints at the beginning of start report
exports.hints = ['Did you know you can say help at any time for a list of commands?',
                    'Did you know you can say next at the end of any bullet point to move to the next question?',
                    'Did you know you can say restart to start your report all over?',
                    'Did you know you can ask for a summary of your current bullet points by saying summarize?'];

// progress states
exports.NUM_STATES = 8;

exports.STATE_INIT = 0;
exports.STATE_PROJECT_NAME = 1;
exports.STATE_PLAN_SHORT = 2;
exports.STATE_PROBLEM = 3;
exports.STATE_LESSON = 4;
exports.STATE_PLAN_LONG = 5;
exports.STATE_NOTES = 6;
exports.STATE_CONFIRMATION = 7;
exports.STATE_SENDING = 8;


