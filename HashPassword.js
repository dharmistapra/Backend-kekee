import bcrypt from "bcrypt"
import readline from "readline"

const SaltRound = 10
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

rl.question('Enter Password >>: ', async (password) => {
    try {
        const bcryptpassword = await bcrypt.hash(password, SaltRound)
        console.log('bcryptpassword', bcryptpassword)

    } catch (err) {
        (err)
    }


    // Close the readline interface
    rl.close();


});