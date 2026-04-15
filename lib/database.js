const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const mongoose = require('mongoose');
let DataBase;
global.tempatDB = "./database/database.json"

if (/mongo/.test(global.tempatDB)) {
    DataBase = class mongoDB {
        constructor(url, options = { useNewUrlParser: true, useUnifiedTopology: true }) {
            this.url = url
            this.data = {}
            this._model = {}
            this.options = options
        }

        read = async () => {
            try {
                if (mongoose.connection.readyState !== 1) {
                    await mongoose.connect(this.url, { ...this.options })
                }
                const schema = new mongoose.Schema({
                    data: { type: Object, required: true, default: {} }
                })
                this._model = mongoose.models.data || mongoose.model('data', schema)
                
                let res = await this._model.findOne({})
                if (!res) {
                    res = await new this._model({ data: {} }).save()
                }
                this.data = res
                return res.data || res
            } catch (e) {
                console.error(chalk.red("MongoDB Read Error:"), e)
                return {}
            }
        }

        write = async (data) => {
            try {
                if (!this.data || !this.data._id) {
                    let res = await new this._model({ data }).save()
                    this.data = res
                    return res
                }
                return await this._model.findByIdAndUpdate(this.data._id, { data }, { new: true })
            } catch (e) {
                console.error(chalk.red("MongoDB Write Error:"), e)
            }
        }
    }
} else {
    DataBase = class dataBase {
        constructor() {
            this.data = {}
            this.file = path.resolve(global.tempatDB)
        }
        read = async () => {
            if (fs.existsSync(this.file)) {
                try {
                    this.data = JSON.parse(fs.readFileSync(this.file))
                } catch {
                    this.data = {}
                }
            } else {
                let dirname = path.dirname(this.file)
                if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true })
                fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2))
            }
            return this.data
        }
        write = async (data) => {
            this.data = data ? data : global.db
            let dirname = path.dirname(this.file)
            if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true })
            fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2))
            return this.file
        }
    }
}

module.exports = DataBase
