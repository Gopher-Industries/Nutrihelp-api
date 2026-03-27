const feedbackRepository = require("../repositories/feedbackRepository");

async function addUserFeedback(
	user_id,
	name,
	contact_number,
	email,
	experience,
	comments
) {
	return feedbackRepository.createUserFeedback({
		userId: user_id,
		name,
		contactNumber: contact_number,
		email,
		experience,
		comments
	});
}

module.exports = addUserFeedback;
