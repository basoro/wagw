
const { sendMessage } = require('./message')
const { body } = require('express-validator')
module.exports = function (router) {

    router.post('/wagateway/kirimpesan', [
        body('sender', 'Wrong Parameters!').notEmpty(),
        body('number', 'Wrong Parameters!').notEmpty(),
        body('message', 'Wrong Parameters!').notEmpty()
    ], sendMessage)
    router.post('/wagateway/kirimgambar', [
        body('sender', 'Wrong Parameters!').notEmpty(),
        body('number', 'Wrong Parameters!').notEmpty(),
        body('message', 'Wrong Parameters!').notEmpty(),
        body('url', 'Wrong Parameters!').notEmpty(),
    ], sendMessage)
    router.post('/wagateway/kirimfile', [
        body('sender', 'Wrong Parameters!').notEmpty(),
        body('number', 'Wrong Parameters!').notEmpty(),
        body('url', 'Wrong Parameters!').notEmpty(),
    ], sendMessage)

}
