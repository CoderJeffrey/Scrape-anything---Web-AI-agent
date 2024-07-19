const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const OpenAI = require('openai');
const readline = require('readline');

const fs = require('fs');
require('dotenv/config');

puppeteer.use(StealthPlugin());
const openai = new OpenAI();
const timeout = 5000;
const mockedGPTResponse = `
\`\`\`json
[
    {
        "identifier": "first_name",
        "action": "type",
        "content": "Jeffrey"
    },
    {
        "identifier": "last_name",
        "action": "type",
        "content": "Liu"
    },
    {
        "identifier": "email",
        "action": "type",
        "content": "jeffrey.jl.liu@gmail.com"
    },
    {
        "identifier": "phone",
        "action": "type",
        "content": "(213)618-8252"
    },
    {
        "identifier": "resume_fieldset",
        "action": "upload",
        "content": "https://aws.com/myresume.pdf"
    },
    {
        "identifier": "job_application_answers_attributes_0_text_value",
        "action": "type",
        "content": "LinkedIn"
    },
    {
        "identifier": "job_application_answers_attributes_1_boolean_value",
        "action": "select",
        "content": "0"
    },
    {
        "identifier": "job_application_answers_attributes_2_text_value",
        "action": "type",
        "content": "He/Him"
    },
    {
        "identifier": "job_application_answers_attributes_3_boolean_value",
        "action": "select",
        "content": "1"
    },
    {
        "identifier": "job_application_answers_attributes_4_text_value",
        "action": "type",
        "content": "University of Southern California"
    },
    {
        "identifier": "job_application_answers_attributes_5_text_value",
        "action": "type",
        "content": "University of Southern California"
    },
    {
        "identifier": "job_application_answers_attributes_6_text_value",
        "action": "type",
        "content": "Computer Science"
    },
    {
        "identifier": "job_application_answers_attributes_7_text_value",
        "action": "type",
        "content": "I am interested in Jane Street because of its innovative approach to technology and data analysis in finance. I heard about Jane Street through LinkedIn. I am currently a student and am excited to transition into a full-time role."
    },
    {
        "identifier": "job_application_answers_attributes_8_text_value",
        "action": "type",
        "content": "2025"
    },
    {
        "identifier": "job_application_answers_attributes_9_answer_selected_options_attributes_9_question_option_id",
        "action": "select",
        "content": "Undergraduate"
    },
    {
        "identifier": "job_application_answers_attributes_10_text_value",
        "action": "type",
        "content": "2018"
    },
    {
        "identifier": "job_application_answers_attributes_11_text_value",
        "action": "type",
        "content": "linkedin.com/in/jeff-jh-liu"
    },
    {
        "identifier": "job_application_answers_attributes_12_text_value",
        "action": "type",
        "content": "CoderJeffrey.github.io/Personal_Website"
    },
    {
        "identifier": "job_application_answers_attributes_13_text_value",
        "action": "type",
        "content": "Student"
    },
    {
        "identifier": "job_application_answers_attributes_14_answer_selected_options_attributes_14_question_option_id",
        "action": "select",
        "content": "LinkedIn"
    }
]
\`\`\`
`;

async function image_to_base64(image_file) {
    return await new Promise((resolve, reject) => {
        // why do we need resolve and reject?
        fs.readFile(image_file, (err, data) => {
            // Resolve: This is called when the asynchronous operation is successful. In your function, when the file is read successfully and converted to a base64 string, resolve(dataURI) is called to indicate the success and pass the result to the next step in the Promise chain.
            // Reject: This is called when the asynchronous operation fails. If an error occurs while reading the file (err is truthy), reject() is called to indicate the failure, allowing the error to be caught and handled appropriately.
            if (err) {
                console.error('Error reading the file:', err);
                reject();
                return;
            }

            // Conversion to Base64: The Buffer object's toString('base64') method is used to convert the binary data into a Base64 encoded string.
            const base64Data = data.toString('base64');

            // By using a Data URL, you embed the picture's data directly into the URL
            // A Data URL is a base64 encoded string of the file's binary data, prefixed with a specific format that tells the browser what kind of file it is and how to handle it
            // A Data URL (or Data URI) essentially embeds the file's data directly within the URL, making it possible to display or download the file without the need for a separate file download from a server
            const dataURI = `data:image/jpeg;base64,${base64Data}`;
            resolve(dataURI);
        });
    });
}

async function input( text ) {
    let the_prompt;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    }); //

    await (async () => {
        return new Promise( resolve => {
            // The rl.question method in the readline module has a specific signature that requires the prompt string as the first argument and the callback function as the second argument.
            rl.question( text, (prompt) => {
                the_prompt = prompt;
                rl.close(); // close the interface means that the program will no longer listen for input on the standard input stream
                resolve();
            } );
        } );
    })();

    return the_prompt;
}

async function sleep( milliseconds ) {
    return await new Promise((r , _) => {
        // r is resolve
        setTimeout( () => {
            r(); // r is shorthand for resolve
        }, milliseconds );
    });
}

async function highlight_links( page ) {
    // remove previous highlights
    await page.evaluate(() => {
        document.querySelectorAll('[gpt-link-text]').forEach(e => {
            e.removeAttribute("gpt-link-text");
        });
    });

    const elements = await page.$$(
        "a, button, input, textarea, [role=button], [role=treeitem]"
    );

    // behaves as if you are defining a function and then immediately calling it with e as the argument
    elements.forEach( async e => { // forEach, it iterates over each element in the array and executes the provided callback function for each element
        await page.evaluate(e => { // execute JavaScript code in the context of the page you are interacting with

            // make sure the element is visible
            function isElementVisible(el) {
                if (!el) return false; // Element does not exist

                function isStyleVisible(el) {
                    const style = window.getComputedStyle(el);
                    return style.width !== '0' &&
                           style.height !== '0' &&
                           style.opacity !== '0' &&
                           style.display !== 'none' &&
                           style.visibility !== 'hidden';
                }


                function isElementInViewport(el) {
                    const rect = el.getBoundingClientRect(); // returns a DOMRect object containing properties like top, right, bottom, left, width, and height. These properties represent the position and dimensions of the element in pixels relative to the viewport.
                    return (
                        rect.top >= 0 &&
                        rect.left >= 0 &&
                        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                    );
                }

                // Check if the element is visible style-wise
                if (!isStyleVisible(el)) {
                    return false;
                }

                // Traverse up the DOM and check if any ancestor element is hidden
                let parent = el;
                while (parent) {
                    if (!isStyleVisible(parent)) {
                        return false;
                    }
                    parent = parent.parentElement;
                }

                // Finally, check if the element is within the viewport
                return isElementInViewport(el);
            }

            e.style.border = "1px solid red";

            const position = e.getBoundingClientRect();

            if( position.width > 5 && position.height > 5 && isElementVisible(e) ) {
                const link_text = e.textContent.replace(/[^a-zA-Z0-9 ]/g, '');
                e.setAttribute( "gpt-link-text", link_text );
            }
        }, e);
    } );
}

// "load" event means the page is fully loaded
async function waitForEvent(page, event) {
    // promise automatically call its callback function with the resolve and reject arguments
    // Why do we need to run in page.evaluate? since it is running in the browser context
    return page.evaluate(event => {
        return new Promise((r, _) => {
            // The e parameter in the callback function represents the event object
            document.addEventListener(event, function(e) {
                r();
            });
        });
    }, event)
}

const parseGPTResponse = (gptResponse) => {
    // extract the string between ```json and ```
    const jsonStart = gptResponse.indexOf('```json');
    const jsonEnd = gptResponse.indexOf('```', jsonStart + 1);

    if (jsonStart === -1 || jsonEnd === -1) {
        console.log("ERROR: List of JSON not found in GPT response");
        return null;
    } else {
        const jsonList = gptResponse.substring(jsonStart + 7, jsonEnd);
        console.log(jsonList);
        return jsonList;
    }
}

// turn the string of a list of JSON objects into an array of JSON objects
const parseJSONList = (jsonListStr) => {
    // parse the string of a list of JSON objects into an array of JSON objects
    // Current format: [{"identifier": "id of the textarea", "action": "type", "content": "the content extracted from users resume"}, ...] in a string

    const jsonList = JSON.parse(jsonListStr);
    return jsonList;
}

const applyActionOnPage = async (page, action) => {
    const identifier = action.identifier;
    const actionType = action.action;
    const content = action.content;

    // based on the identifier find the element
    let targetElement = await page.$(`#${identifier}`);
    console.log("targetElement: %o", targetElement);

    if (!targetElement) {
        console.log("ERROR: Element with id " + identifier + " not found.");
        return;
    }

    if (actionType === "type") {
        await targetElement.type(content);
    } else if (actionType === "select") {
        await targetElement.select(content);
    }
}

const fetchActionsFromGPT4 = async (page, applicationFieldsContent) => {
    let messages = [
        {
            "role": "system",
            "content": `You are a job application bot. 
            You will be given an url of the job posting and the user resume.
            Your task is to find out the job application form fields and fill them out using the content extracted from the user's resume.
            The fields can include textarea, input, select, radio, checkbox, etc.
            For fields that cannot be extracted from user's resume, just generate content that makes sense to you.
            You can fill out the fields by answering with the following JSON format:
          
            You can fill out textarea of a field by answering with the following JSON format:
            Example: for text area:
            {
                "identifier": "id of the textarea",
                "action": "type", 
                "content": "the content extracted from users resume"
            }
          
            You can fill out select of a field by answering with the following JSON format:
            Example: for select:
            {
                "identifier": "id of the select",
                "action": "select",
                "content": "the content extracted from users resume that matches option value"
            }

            Once you have filled out all the applicable fields, you can return a list of JSON Objects referring to the previous JSON format you used to fill out the fields.
            [
               {JSON OBJECT1},
               {JSON OBJECT2},
               {JSON OBJECT3},
            ]
            
            For each element, use its id as the identifier (extracted from id=\"\", not the name or any other attribute.
            Do not make up or guess links and do not write weird characters like // that are not part of the JSON format.
            Ignore resume_text and resume_upload related fields.
            For question asking to submit resume or upload resume text, always choose to upload and use the following url as the answer: https://aws.com/myresume.pdf
           `,
        }
    ];

    // console.log("GPT: What is the url of the posting?")
    // const url = await input("You: ");
    const url = "https://boards.greenhouse.io/janestreet/jobs/7108437002"
    console.log();

    // console.log("GPT: What is your resume?")
    // const resume = await input("You: ");
    const resume = "Jeffrey Liu LinkedIn: linkedin.com/in/jeff-jh-liu Github: github.com/CoderJeffrey Website: CoderJeffrey.github.io/Personal_Website Education University of Southern California Bachelor of Science - Computer Science, GPA: 3.96 Courses: Applications of Machine Learning, Principles of Software Development, Computer Systems, Internetworking Email: jeffrey.jl.liu@gmail.com Mobile: (213)618-8252 Location: Los Angeles, CA Los Angeles, CA Skills Languages: Frameworks: Tools: Certificates: Java, C, C++, Python, JavaScript, HTML, Bash, SQL Spring Boot, React, Node.js, Angular, Unix/Linux Supabase, OpenSearch, Elasticsearch, Streamlit, EmailJS, MongoDB, MySQL, Tensorflow, Git Advanced Software Engineering (CodePath) Expected Dec 2024 Work Experience LinkedIn Mountain View, CA Software Engineer Intern May 2024 - Aug 2024 • Successfully migrated LinkedIn internal Sales System and implemented precise credit assigning logic to sales rep, ensuring fair and accurate credit attributions for additional 20% of the deals made in LinkedIn. • Collaborated with cross-functional teams to gather key requirements for the migrated sales system to meet all stakeholders’ needs. • Applied Scrum development practices and code review for iterative project development, and wrote unit tests to cover above 95% of the potential sales cases. Amazon Web Services (AWS) East Palo Alto, CA Software Engineer Intern May 2023 - Aug 2023 • Extracted AWS OpenSearch SearchBackPressure Service request cancellation stats using Java and populated the extracted metrics to an SQLite database via JOOQ (Java Object Oriented Query). • Developed SearchBackPressure Root Cause Analysis (RCA) framework to identify requests overloading database clusters, and to suggest actions for autotuning SearchBackPressure cancellation thresholds. • Benchmarked the project, showcasing its capacity to prevent up to 20% of data node crashes during high-load or malicious request scenarios. • Code changes contributed to open source projects OpenSearch Performance Analyzer RCA and OpenSearch Performance Analyzer. Stanford Artificial Intelligence Laboratory (SAIL) Stanford, CA Research Assistant (Nature Language Processing) Jan 2023 - May 2023 • Engineered a full-stack system using React for the front-end and Node.js for the back-end, allowing users to restructure sentences into more positive phrasing while retaining the essence of the content. • Integrated the HuggingFace Gradio API and ChatGPT API into the system, allowing users to receive multiple rephrased sentence options. Information Sciences Institute (USC/ISI) Los Angeles, CA Software Engineer Intern May 2022 - Aug 2022 • Utilized the NLU T5 Paraphrase Generator to enlarge existing training dataset by 320%. • Developed a script to extract users’ names and phone numbers from the conversations with our chatbot, using Python spaCy library and Regular Expressions, with an accuracy rate of 93%. Publications Samba: Identifying Inappropriate Videos for Young Children: Accepted by 31st The Conference on Information and Knowledge Management (CIKM) (Fourth Author) • Developed a fusion model that improves the accuracy of predicting whether a YouTube video is appropriate for children by at least 7% over other state-of-the-art classifiers. Did your child get disturbed by an inappropriate advertisement on YouTube?: Accepted by 28th ACM SIGKDD Conference on Knowledge Discovery and Data Mining (KDD) (First Author) Projects TechBuddy • A job bot that posts internship alerts on LinkedIn Easy ATS Resume Cheker Website Website • Web app that allows users to check whether their resume is ATS-friendly, serving 1.9K users."
    console.log();

    let prompt = "Company URL: " + url + "\n\n" + "Resume: " + resume + "\n\n" + applicationFieldsContent;

    messages.push({
        "role": "user",
        "content": prompt,
    });

    while( true ) {
        // retrieve message from GPT-4
        // const response = await openai.chat.completions.create({
        //     model: "gpt-4o",
        //     messages: messages,
        //     max_tokens: 1024,
        // });
        //
        // const gpt_response = response.choices[0].message;
        // const gpt_response_text = gpt_response.content;
        const gpt_response_text = mockedGPTResponse;

        messages.push({
            "role": "assistant",
            "content": gpt_response_text,
        });

        console.log( "GPT: " + gpt_response_text );


        // if (message_text.indexOf('{"click": "') !== -1) {
        //     // if the message contains a click instruction
        //     let parts = message_text.split('{"click": "');
        //     parts = parts[1].split('"}');
        //     const link_text = parts[0].replace(/[^a-zA-Z0-9 ]/g, '');
        //
        //     console.log("Clicking on " + link_text)
        //
        //     try {
        //         // have all gpt-link-text attributes
        //         const elements = await page.$$('[gpt-link-text]');
        //
        //         let partial;
        //         let exact;
        //
        //         // iterate through all elements with gpt-link-text attribute
        //         for (const element of elements) {
        //             // evaluate() allows you to execute callback functions in the context of the page you are interacting with
        //             const attributeValue = await element.evaluate(el => el.getAttribute('gpt-link-text'));
        //
        //             if (attributeValue.includes(link_text)) {
        //                 partial = element;
        //             }
        //
        //             if (attributeValue === link_text) {
        //                 exact = element;
        //             }
        //         }
        //
        //         if (exact || partial) {
        //             // run multiple promises concurrently. It waits for all the included promises to either resolve or for the first one to reject. If all the promises resolve, it returns an array of their results.
        //             const [response] = await Promise.all([
        //                 // page.waitForNavigation method is 30 seconds
        //                 page.waitForNavigation({
        //                     waitUntil: 'domcontentloaded',
        //                     timeout: 10000})
        //                     .catch(e => console.log("Navigation timeout/error:", e.message)),
        //                 (exact || partial).click()
        //             ]);
        //
        //             // Additional checks can be done here, like validating the response or URL
        //             // ll resolve or reject as soon as either of the two promises settles (resolves or rejects
        //             await Promise.race( [
        //                 waitForEvent(page, 'load'),
        //                 sleep(timeout)
        //             ] );
        //
        //             await highlight_links(page);
        //
        //             await page.screenshot({
        //                 path: "screenshot.jpg",
        //                 quality: 100,
        //                 fullpage: true
        //             });
        //
        //             screenshot_taken = true;
        //         } else {
        //             throw new Error("Can't find link");
        //         }
        //     } catch (error) {
        //         console.log("ERROR: Clicking failed", error);
        //
        //         messages.push({
        //             "role": "user",
        //             "content": "ERROR: I was unable to click that element",
        //         });
        //     }
        //
        //     continue;
        // } else if (message_text.indexOf('{"url": "') !== -1) {
        //     // if the message contains a URL instruction
        //     let parts = message_text.split('{"url": "');
        //     parts = parts[1].split('"}');
        //     url = parts[0];
        //
        //     continue;
        // }

        // user further interaction
        // const prompt = await input("You: ");
        // console.log();  ``
        //
        // messages.push({
        //     "role": "user",
        //     "content": prompt,
        // });

        const jsonListStr = parseGPTResponse(gpt_response_text);
        const actionsList = parseJSONList(jsonListStr);

        console.log("actionsList: %o", actionsList);

        // loop through the list of actions and apply them to the page
        for (const action of actionsList) {
            await applyActionOnPage(page, action);
        }

        const prompt = await input("You: ");
        console.log();

    }
}

(async () => {
    console.log( "###########################################" );
    console.log( "# GPT4V-Browsing by Unconventional Coding #" );
    console.log( "###########################################\n" );

    const browser = await puppeteer.launch( {
        headless: false,
        executablePath: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google\ Chrome\ Canary',
        userDataDir: '/Users/jeffreyliu/Library/Application\ Support/Google/Chrome\ Canary/Default', // default profile
    } );

    const page = await browser.newPage();
    let tmp_url = "https://boards.greenhouse.io/janestreet/jobs/7108437002";

    // screen size large enough to capture most of the content
    await page.setViewport( {
        width: 1200,
        height: 1200,
        deviceScaleFactor: 1, // device pixel ratio
    });

    await page.goto( tmp_url, {
        waitUntil: "domcontentloaded",
        timeout: timeout,
    } );

    // await Promise.race( [
    //     waitForEvent(page, 'load'),
    //     sleep(timeout)
    // ] );

    const content = await page.content();
    console.log(content);

    // print the html content of the page
    // console.log(content);

    // Wait for the element with id "myname" to be present in the DOM
    await page.waitForSelector('#application');

    // Find the element with id "myname"
    const applicationFields = await page.$('#application');

    // Check if the element exists
    if (applicationFields) {
        // Retrieve the content of the element
        const applicationFieldsContent = await page.evaluate(e => e.innerHTML, applicationFields);

        // Print the content of the element
        // console.log("applicationFields: ");
        // console.log(applicationFieldsContent);
        // console.log("\n end of applicationFields");

        await fetchActionsFromGPT4(page, applicationFieldsContent);
    } else {
        console.log('Element with id "applicationFields" not found.');
    }

    // print the
    // // print the content of the div
    // console.log("applicationContent: ");
    // // console.log(applicationContent);
    // console.log("\n end of applicationContent");

    // await fetchActionsFromGPT4();

})();

// (async () => {
//     console.log( "###########################################" );
//     console.log( "# GPT4V-Browsing by Unconventional Coding #" );
//     console.log( "###########################################\n" );
//
//     const browser = await puppeteer.launch( {
//         headless: false,
//         executablePath: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google\ Chrome\ Canary',
//         userDataDir: '/Users/jeffreyliu/Library/Application\ Support/Google/Chrome\ Canary/Default', // default profile
//     } );
//
//     const page = await browser.newPage();
//
//     // screen size large enough to capture most of the content
//     await page.setViewport( {
//         width: 1200,
//         height: 1200,
//         deviceScaleFactor: 1, // device pixel ratio
//     } );
//
//     const messages = [
//         {
//             "role": "system",
//             "content": `You are a job application bot.
//             You will be given instructions on what to do by browsing. You are connected to a web browser and you will be given the screenshot of the website you are on. The links on the website will be highlighted in red in the screenshot. Always read what is in the screenshot. Don't guess link names.
//
//             You can go to a specific URL by answering with the following JSON format:
//             {"url": "url goes here"}
//
//             You can click links on the website by referencing the text inside of the link/button, by answering in the following JSON format:
//             {"click": "Text in link"}
//
//             Once you are on a URL and you have found the answer to the user's question, you can answer with a regular message.
//
//             Use google search by set a sub-page like 'https://google.com/search?q=search' if applicable. Prefer to use Google for simple queries. If the user provides a direct URL, go to that one. Do not make up links`,
//         }
//     ];
//
//     console.log("GPT: How can I assist you today?")
//     const prompt = await input("You: ");
//     console.log();
//
//     messages.push({
//         "role": "user",
//         "content": prompt,
//     });
//
//     let url;
//     let screenshot_taken = false;
//
//     while( true ) {
//         if( url ) {
//             console.log("Crawling " + url);
//             await page.goto( url, {
//                 waitUntil: "domcontentloaded",
//                 timeout: timeout,
//             } );
//
//             await Promise.race( [
//                 waitForEvent(page, 'load'),
//                 sleep(timeout)
//             ] );
//
//             await highlight_links( page );
//
//             await page.screenshot( {
//                 path: "screenshot.jpg",
//                 fullPage: true,
//             } );
//
//             screenshot_taken = true;
//             url = null;
//         }
//
//         if( screenshot_taken ) {
//             const base64_image = await image_to_base64("screenshot.jpg");
//
//             messages.push({
//                 "role": "user",
//                 "content": [
//                     {
//                         "type": "image_url",
//                         "image_url": {
//                             "url": `${base64_image}`,
//                             "detail": "high"
//                         }
//                     },
//                     {
//                         "type": "text",
//                         "text": "Here's the screenshot of the website you are on right now. You can click on links with {\"click\": \"Link text\"} or you can crawl to another URL if this one is incorrect. If you find the answer to the user's question, you can respond normally.",
//                     }
//                 ]
//             });
//
//             screenshot_taken = false;
//         }
//
//         // retrieve message from GPT-4
//         const response = await openai.chat.completions.create({
//             model: "gpt-4o",
//             messages: messages,
//             max_tokens: 1024,
//         });
//
//         const message = response.choices[0].message;
//         const message_text = message.content;
//
//         messages.push({
//             "role": "assistant",
//             "content": message_text,
//         });
//
//         console.log( "GPT: " + message_text );
//
//
//         if (message_text.indexOf('{"click": "') !== -1) {
//             // if the message contains a click instruction
//             let parts = message_text.split('{"click": "');
//             parts = parts[1].split('"}');
//             const link_text = parts[0].replace(/[^a-zA-Z0-9 ]/g, '');
//
//             console.log("Clicking on " + link_text)
//
//             try {
//                 // have all gpt-link-text attributes
//                 const elements = await page.$$('[gpt-link-text]');
//
//                 let partial;
//                 let exact;
//
//                 // iterate through all elements with gpt-link-text attribute
//                 for (const element of elements) {
//                     // evaluate() allows you to execute callback functions in the context of the page you are interacting with
//                     const attributeValue = await element.evaluate(el => el.getAttribute('gpt-link-text'));
//
//                     if (attributeValue.includes(link_text)) {
//                         partial = element;
//                     }
//
//                     if (attributeValue === link_text) {
//                         exact = element;
//                     }
//                 }
//
//                 if (exact || partial) {
//                     // run multiple promises concurrently. It waits for all the included promises to either resolve or for the first one to reject. If all the promises resolve, it returns an array of their results.
//                     const [response] = await Promise.all([
//                         // page.waitForNavigation method is 30 seconds
//                         page.waitForNavigation({
//                             waitUntil: 'domcontentloaded',
//                             timeout: 10000})
//                             .catch(e => console.log("Navigation timeout/error:", e.message)),
//                         (exact || partial).click()
//                     ]);
//
//                     // Additional checks can be done here, like validating the response or URL
//                     // ll resolve or reject as soon as either of the two promises settles (resolves or rejects
//                     await Promise.race( [
//                         waitForEvent(page, 'load'),
//                         sleep(timeout)
//                     ] );
//
//                     await highlight_links(page);
//
//                     await page.screenshot({
//                         path: "screenshot.jpg",
//                         quality: 100,
//                         fullpage: true
//                     });
//
//                     screenshot_taken = true;
//                 } else {
//                     throw new Error("Can't find link");
//                 }
//             } catch (error) {
//                 console.log("ERROR: Clicking failed", error);
//
//                 messages.push({
//                     "role": "user",
//                     "content": "ERROR: I was unable to click that element",
//                 });
//             }
//
//             continue;
//         } else if (message_text.indexOf('{"url": "') !== -1) {
//             // if the message contains a URL instruction
//             let parts = message_text.split('{"url": "');
//             parts = parts[1].split('"}');
//             url = parts[0];
//
//             continue;
//         }
//
//         // user further interaction
//         const prompt = await input("You: ");
//         console.log();  ``
//
//         messages.push({
//             "role": "user",
//             "content": prompt,
//         });
//     }
// })();
