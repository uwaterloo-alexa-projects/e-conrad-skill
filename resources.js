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
exports.restartReportWords = ['restart report'];
exports.restartQuestionWords = ['restart question'];
exports.MORE_INFO_PHRASE = 'Anything else?';
exports.nextStepPhrases = ['nothing', 'nope', 'no', 'finish', 'next', 'continue', 'stop', 'that\'s it', 'skip', 'done'];
exports.repeatAnswers = "repeat my answers";
exports.finishAnswers = "finish my answers";
exports.sendEmailPrompt = "send email";

exports.keys = {
    
}

exports.prompts = {
    post_restart_report : 'We have restarted your entire report. Say \"start report\" to begin completing your report',
    post_restart_question : 'Restarting Question... Say \"continue report\" to begin answering this question',
    no_bullets : "Sorry, you currently do not have any bullet points for this section. Say continue report to resume progress",
    help : 'You can say, \"Start report\" to begin your report. ' +
            '\"Restart\" to restart your entire report. ' +
            '\"Skip\" to move onto the next question. ' +
            'You can also say \"Next\" immediately after a bullet point if you have fully completed answering a section. ' +
            'End of help. Say \"continue report\" to resume your current question',
    start : 'Welcome to the Conrad Progress Reporting Skill. Please say "start report" to get started.',
    confirmation_start : '. Is this alright? Say send email to send. Say finish my answers to hear the remainder of the summary.',
    confirmation_end : ' . Is this alright? Say send email to send. Say restart if you wish to start over.',
    re_confirm_start : 'Sorry, I didn\'t understand that. If you wish to send email, say send email. If you wish to hear your answers, say repeat my answers',
    re_confirm_end : 'Sorry, I didn\'t understand that. If you wish to send email, say send email. If you wish to finish hearing your answers, say finish my answers'
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
exports.STATE_FINISH_ANSWER_SUMMARY = 8;


