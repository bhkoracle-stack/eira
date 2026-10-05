function page(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · Eira</title>
  <style>
    body { font-family: Georgia, serif; max-width: 680px; margin: 40px auto; padding: 0 20px; color: #1c1915; line-height: 1.55; }
    h1 { font-weight: 500; }
    a { color: #0e6b66; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${body}
  <p><a href="/legal/privacy">Privacy</a> · <a href="/legal/terms">Terms</a> · <a href="/legal/copyright">Copyright</a> · <a href="/legal/child-safety">Child safety</a> · <a href="/legal/support">Support</a></p>
  <p>© 2026 Eira. All rights reserved.</p>
</body>
</html>`;
}

const privacyHtml = page(
  "Privacy policy",
  `<p>Eira is a dating app for adults 18 and older. This policy explains what the app stores on the server you connect to.</p>
  <h2>Data we store</h2>
  <ul>
    <li>Account: email address and a hashed password. We never store the raw password.</li>
    <li>Profile: name, birthday, gender, who you want to meet, city, bio, and an optional photo.</li>
    <li>Location: the city you type, and, if you allow it, your phone's location so people can be ordered by distance. We do not track location in the background.</li>
    <li>Activity: likes, passes, matches, blocks, and reports.</li>
    <li>Messages: chat text, photos, and files sent between matches.</li>
    <li>Password reset: a 6-digit code emailed to you when you ask to reset your password. The code expires in 10 minutes.</li>
    <li>Calls: video and audio are sent directly between phones when possible. The server only relays the connection setup, not a recording of the call.</li>
  </ul>
  <h2>Why</h2>
  <p>We use this data to run accounts, show profiles, deliver matches, chat, and video calls, and to let people block or report others.</p>
  <h2>Sharing</h2>
  <p>Your profile is shown to other adults using the same Eira server. We do not sell personal data.</p>
  <h2>Moderation</h2>
  <p>The operator of the server can review reports, profile photos, and files sent in chat, then ban or delete an account that breaks the terms.</p>
  <h2>Deletion</h2>
  <p>In the app, open You and choose Delete account. That removes your profile, photo, likes, matches, and messages from this server.</p>
  <h2>Contact</h2>
  <p>For help with an account, a photo, chat, or safety, use Support in the app or the <a href="/legal/support">support page</a>.</p>`
);

const copyrightHtml = page(
  "Copyright",
  `<p>© 2026 Eira. All rights reserved.</p>
  <p>The Eira name, logo, interface, and this software are protected by copyright. You may run the app for personal use against a server you are allowed to use. You may not copy the app, the branding, or the interface and publish them as your own.</p>
  <p>Photos and messages you upload stay yours. By posting them you let other adults on the same server see them as part of using Eira. Sample portraits shipped with the local demo are for demonstration only.</p>
  <p>To report a copyright concern, use <a href="/legal/support">Support</a> and choose the topic Copyright.</p>`
);

const supportHtml = page(
  "Support",
  `<p>Eira support covers accounts, profile photos, chat, calls, and safety. Adults 18 and older only.</p>
  <ul>
    <li>Account: sign-in, password, or deleting your profile. Deletion is under You, then Delete account.</li>
    <li>Photos: tap your profile photo, then choose a picture or take one. Use JPG, PNG, or WebP.</li>
    <li>Chat: open a match, then attach a photo, take a photo, or send a PDF or text file.</li>
    <li>Calls: phone and video run in the Android app, not in a browser preview.</li>
    <li>Safety: block or report someone from the chat options menu.</li>
  </ul>
  <p>Email <a href="mailto:support@eira.app">support@eira.app</a>, or send a message from Support inside the app. Include the email on your account so a reply can reach you.</p>`
);

const childSafetyHtml = page(
  "Child safety standards",
  `<p>Eira is a dating app for adults who are 18 or older. Child sexual abuse and exploitation (CSAE), including child sexual abuse material (CSAM), are prohibited.</p>
  <h2>Who may use Eira</h2>
  <ul>
    <li>You must be at least 18 to create an account. Signup asks for a birthday and rejects anyone under 18.</li>
    <li>Do not create an account for a child, and do not present a child as an adult.</li>
  </ul>
  <h2>What is not allowed</h2>
  <ul>
    <li>Any sexual content involving a person under 18, including photos, video, drawings, or messages.</li>
    <li>Asking a child for sexual content, or arranging to meet a child for a sexual purpose.</li>
    <li>Sharing, requesting, or linking to child sexual abuse material.</li>
    <li>Grooming, sexual extortion, or trafficking of a child.</li>
  </ul>
  <h2>How to report</h2>
  <p>In the app, open the chat with that person, choose the options menu, and report them. You can also email <a href="mailto:bhk.oracle@gmail.com">bhk.oracle@gmail.com</a>. Include the account email, the profile name, and what you saw. Do not send the illegal material itself.</p>
  <h2>What we do</h2>
  <ul>
    <li>We review reports of child sexual abuse material and remove the account and the content we can identify.</li>
    <li>We disable accounts that break these standards.</li>
    <li>We report child sexual abuse material to the appropriate regional authority when the law requires it.</li>
  </ul>
  <h2>Contact</h2>
  <p>The child-safety contact for Eira is <a href="mailto:bhk.oracle@gmail.com">bhk.oracle@gmail.com</a>. This address can answer questions about these standards and about reports.</p>`
);

const termsHtml = page(
  "Terms of use",
  `<p>Eira is for adults who are 18 or older. By creating an account you confirm that you are at least 18.</p>
  <ul>
    <li>Be honest about who you are. Do not impersonate someone else.</li>
    <li>Do not harass, threaten, or send illegal content.</li>
    <li>You can block or report another person from the chat screen.</li>
    <li>Video calls use your camera and microphone only while a call is open.</li>
    <li>We may remove accounts that break these terms.</li>
  </ul>
  <p>The app is provided as software you run against your own server. The operator of that server is responsible for backups, uptime, and complying with local law.</p>`
);

module.exports = { privacyHtml, termsHtml, copyrightHtml, supportHtml, childSafetyHtml };
