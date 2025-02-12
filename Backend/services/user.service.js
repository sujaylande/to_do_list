const userModel = require('../models/user.model');


module.exports.createUser = async ({
    firstname, lastname, email, password, profilePicture, phoneNumber
}) => {
    if (!firstname || !email || !password || !profilePicture || !phoneNumber) {
        throw new Error('All fields are required');
    }
    const user = userModel.create({
        fullname: {
            firstname,
            lastname
        },
        email,
        password,
        profilePicture,
        phoneNumber
    })

    return user;
}