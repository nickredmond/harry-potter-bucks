const express = require('express');
const bodyParser = require('body-parser');
const mongodb = require('mongodb');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'nickfuckingredmond';

let CORRECT_ANSWERS_NEEDED = 0;
let userData = {};
let REWARD_CODES_BY_USER_CODE = {};
let ACCESS_TOKEN = null;

const allowAnyOrigin = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
};

var app = express();
app.use(bodyParser.json());
app.use(allowAnyOrigin);

REWARD_CODES_BY_USER_CODE = process.env.REWARD_CODES ? JSON.parse(process.env.REWARD_CODES) : { "testUser": "testCode" };
ACCESS_TOKEN = process.env.ACCESS_TOKEN || "testsecret";
CORRECT_ANSWERS_NEEDED = parseInt(process.env.CORRECT_ANSWERS_NEEDED) || 25;

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log("app started.");
});

app.post("/authenticate", (req, res) => {
    const userCode = req.body.userCode;
    if (Object.keys(REWARD_CODES_BY_USER_CODE).includes(userCode)) {
        userData[userCode] = {
            questionIdsAttempted: [],
            numberOfCorrectAnswers: 0
        };
        res.send({ accessToken: ACCESS_TOKEN });
    }
    else {
        res.status(400).send({ isWrongUserCode: true });
    }
});

app.post("/question", (req, res) => {
    const userCode = req.body.userCode;
    const accessToken = req.body.accessToken;
    if (ACCESS_TOKEN === accessToken) {
        if (!userData[userCode]) {
            res.status(401).send({error: 'Please authenticate before continuing'});
        }
        else {
            const questionsRemaining = QUESTIONS.filter(question => {
                return !userData[userCode].questionIdsAttempted.includes(question.id);
            });
            const nextQuestion = questionsRemaining[Math.floor(Math.random() * questionsRemaining.length)];
            const responseBody = {
                id: nextQuestion.id,
                text: nextQuestion.text,
                numberOfAnswers: nextQuestion.numberOfAnswers
            }
            res.send(responseBody);
        }
    }
    else {
        res.status(401).send('Access token invalid or missing!');
    }
});

app.post("/submit", (req, res) => {
    const userCode = req.body.userCode;
    const accessToken = req.body.accessToken;
    const questionId = req.body.questionId;
    if (ACCESS_TOKEN === accessToken) {
        if (!userData[userCode]) {
            res.status(401).send({error: 'Please authenticate before continuing'});
        }
        else if (userData[userCode].questionIdsAttempted.includes(questionId)) {
            res.status(400).send({error: 'Cannot submit same question more than once.'})
        }
        else {
            

            const question = QUESTIONS.find(question => question.id === questionId);
            let isRightAnswer = false;
            
            if (question.numberOfAnswers > 1) {
                for (var i = 0 ; i < question.possibleAnswers.length && !isRightAnswer; i++) {
                    const possibleAnswer = question.possibleAnswers[i];
                    let isCorrect = true;
                    const answer = JSON.parse(JSON.stringify(req.body.answer));
                    const formattedAnswer = [];
                    answer.forEach(part => formattedAnswer.push(part.toString().trim().toLowerCase()));

                    for (var j = 0; j < possibleAnswer.length && isCorrect; j++) {
                        const index = formattedAnswer.indexOf(possibleAnswer[j].toString().toLowerCase());
                        if (index >= 0) {
                            formattedAnswer.splice(index, 1);
                        }
                        else {
                            isCorrect = false;
                        }
                    }

                    isRightAnswer = isCorrect && formattedAnswer.length === 0;
                }
            }
            else {
                for (var i = 0; i < question.possibleAnswers.length && !isRightAnswer; i++) {
                    const possibleAnswer = question.possibleAnswers[i].toString().toLowerCase();
                    isRightAnswer = req.body.answer.toString().trim().toLowerCase() === possibleAnswer;
                }
            }

            userData[userCode].questionIdsAttempted.push(questionId);
            if (isRightAnswer) {
                userData[userCode].numberOfCorrectAnswers = userData[userCode].numberOfCorrectAnswers + 1;
            }
            else {
                userData[userCode] = {
                    questionIdsAttempted: [],
                    numberOfCorrectAnswers: 0
                };
            }

            const isTestComplete = userData[userCode].numberOfCorrectAnswers >= CORRECT_ANSWERS_NEEDED;
            const reward = isTestComplete ? REWARD_CODES_BY_USER_CODE[userCode] : null;

            res.send({ isCorrect: isRightAnswer, reward: reward });
        }
        
    }
    else {
        res.status(401).send('Access token invalid or missing!');
    }
});

const QUESTIONS = [
    {
        id: 1,
        text: 'Many know that Gryffindor\'s ghost is Nearly Headless Nick. But what is his full name?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: [
            'Sir Nicholas de Mimsy-Porpington', 
            'Sir Nicholas Mimsy-Porpington',
            'Nicholas de Mimsy-Porpington',
            'Nicholas Mimsy-Porpington'
        ]
    },
    {
        id: 2,
        text: 'Harry, Ron, and Hermione help save the Sorcerer\'s Stone from being stolen. How old was its co-creator, Nicholas Flamel, when he decided to destroy it?',
        answerType: 'number',
        numberOfAnswers: 1,
        possibleAnswers: [665]
    },
    {
        id: 3,
        text: 'Snape grilled Harry about this on his first day in Potions. Monkshood and wolfsbane are the same plant, also known as what?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: ['Aconite']
    },
    {
        id: 4,
        text: 'How many staircases does Hogwarts have?',
        answerType: 'number',
        numberOfAnswers: 1,
        possibleAnswers: [142]
    },
    {
        id: 5,
        text: 'How many possible Quidditch fouls are there?',
        answerType: 'number',
        numberOfAnswers: 1,
        possibleAnswers: [700]
    },
    {
        id: 6,
        text: 'In The Sorcerer\'s Stone, Harry and his friends are awarded last-minute House Points, putting Gryffindor ahead of Slytherin by just 10 points. What were the houses\' final scores?',
        answerType: 'number',
        numberOfAnswers: 2,
        possibleAnswers: [[482, 472]]
    },
    {
        id: 7,
        text: 'Ever the eccentric, Dumbledore has a scar above his left knee that is a perfect map of what?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: [
            'The London Underground',
            'The Underground',
            'London Underground',
            'The Tube',
            'The London Tube',
            'London Tube'
        ]
    },
    {
        id: 8,
        text: 'What is the name of the company where Vernon Dursley works?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: [
            'Grunnings',
            'Grunnings Company',
            'Grunnings Co',
            'Grunnings Co.'
        ]
    },
    {
        id: 9,
        text: 'For Harry\'s 17th birthday, what colour did Hermione turn the leaves of the Weasley\'s crabapple tree?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: ['Gold']
    },
    {
        id: 10,
        text: 'Cedric Diggory let Harry use the prefect\'s bathroom in The Goblet of Fire. What man\'s statue is next to the special lavatory entrance?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: [
            'Boris the Bewildered',
            'Boris'
        ]
    },
    {
        id: 11,
        text: 'What is the max speed for a Firebolt broomstick?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: ['150', '150 mph', '150 m.p.h.', '150 miles per hour', '150 miles per hr']
    },
    {
        id: 12,
        text: 'Harry first took the Knight Bus in The Prisoner of Azkaban. How much does a ticket cost if it includes hot chocolate?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: ['14', '14 sickles', '14 sickle']
    },
    {
        id: 13,
        text: 'In the Hall of Prophecy there are rows and rows of glowing orbs. Which row number contains the prophecy about Harry and Voldemort?',
        answerType: 'number',
        numberOfAnswers: 1,
        possibleAnswers: [97]
    },
    {
        id: 14,
        text: 'In the Quidditch World Cup, Ireland\'s team had three main chasers: Mullet, Troy, and Moran. Which one scored the first goal?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: ['Troy']
    },
    {
        id: 15,
        text: 'On the wall across from the Room of Requirement, there is a tapestry showing a wizard trying to teach trolls ballet. What\'s his name?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: [
            'Barnabus the Barmy',
            'Barnabus'
        ]
    },
    {
        id: 16,
        text: 'The visitor\'s entrance to the Ministry of Magic is an abandoned red telephone booth in London. What is the five-digit code you must dial to get in?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: [
            '6-2-4-4-2',
            '62442',
            '6 2 4 4 2'
        ]
    },
    {
        id: 17,
        text: 'What is the full name (first and last) of the Apparition instructor who comes to Hogwarts in Harry’s sixth year?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: ['Wilkie Twycross']
    },
    {
        id: 18,
        text: 'Voldemort stole Helga Hufflepuff\'s cup from an old woman named Hepzibah Smith. What was the name of her house-elf?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: ['Hokey']
    },
    {
        id: 19,
        text: 'Ginny Weasley bought a pet Pygmy Puff from her older brothers\' joke shop. What did she name it?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: ['Arnold']
    },
    {
        id: 20,
        text: 'What is Fred Weasley’s chosen code name on Potterwatch, the secretive radio programme set up by the Order of the Phoenix?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: ['Rapier']
    },
    {
        id: 21,
        text: 'What is Ronald Weasley\'s middle name?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: ['Bilius']
    },
    {
        id: 22,
        text: 'What is Voldemort\'s mother\'s name?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: [
            'Merope Voldemort',
            'Merope'
        ]
    },
    {
        id: 23,
        text: 'What is the name of Barty Crouch\'s house elf?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: ['Winky']
    },
    {
        id: 24,
        text: 'What is the name of Bellatrix Lestrange\'s Husband?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: ['Rodolphus', 'Rodolphus Lestrange']
    },
    {
        id: 25,
        text: 'What is the name of the Quidditch move where a seeker "fakes" seeing the snitch and dives to the ground but pulls out of the dive just in time but the opposing seeker plumets to the ground?',
        answerType: 'text',
        numberOfAnswers: 1,
        possibleAnswers: ['Wronsky Feint']
    }
];