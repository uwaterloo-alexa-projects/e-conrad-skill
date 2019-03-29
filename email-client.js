
// internal variables

let data = {};
let userName = {};

// exports

exports.generateConfirmationVoicePrompt = function(userName, data) {
    console.log("generating voice confirmation");
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

exports.generateParams = function(userName, data, userEmail) {
    console.log("Generating params for email. Sending to user " + userEmail);
    return {
        Destination: {
            ToAddresses: [userEmail]
            //ToAddresses: [recipient]
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: generateEmailHtmlBody(userName, data)
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
        Source: `Conrad Progress Report <uwalexacoop@gmail.com>`
        //Source: 'Email from Xuan <'+recipient+'>'
    };
}

function generateEmailHtmlBody(userName, data) {
    console.log("generating email body");
    return `<html>
        <head><b>Progress Report</b></head>
        <body>
            <p> <b>Student Name :</b> ${userName} </p>
            <p> <b> Project Name:</b> ${data.projectName} </p>
            <p> <b> Reporting Date:</b> ${getTodaysDate()} </p><br/>
            <h4>Task(s) Planned for the Month and next 15 days：</h4> <p> ${formatBulletPoints(data.taskPlan15Days)} </p>
            <h4>Problem or Challenges you faced and had to manage：</h4> <p> ${formatBulletPoints(data.problemOrChallenges)}</p>
            <h4>Lesson(s) Learned：</h4> <p>  ${formatBulletPoints(data.lessonsLearned)} </p>
            <h4>Task(s) Planned for Next Month：</h4> <p>   ${formatBulletPoints(data.taskPlanNextMonth)} </p>
            <h4>Notes/Comments：</h4> <p>  ${formatBulletPoints(data.notes)} </p><br/>
        </body>
    </html>`;

}

function generateEmailTextBody() {
    return `
              Hi ,
              ...
            `;
}

function formatBulletPoints(bullets) {
    let text = "";
    bullets.forEach(bullet => {
        if (bullet != "") {
            text += bullet + ". <br/>";
        }
    });
    return text;
}

function convertBulletPointsToText(bullets) {
    let text = "";
    bullets.forEach(bullet => {
        text += bullet + ". ";
    });
    return text;
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