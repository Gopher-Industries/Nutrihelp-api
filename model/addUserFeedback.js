const supabase = require("../dbConnection.js");

async function addUserFeedback(
	user_id,
	name,
	contact_number,
	email,
	experience,
	comments
) {
	try {
		let { data, error } = await supabase.from("userfeedback").insert({
			user_id: user_id,
			name: name,
			contact_number: contact_number,
			email: email,
			experience: experience,
			comments: comments,
		});
		return data;
	} catch (error) {
		throw error;
	}
}

module.exports = addUserFeedback;
