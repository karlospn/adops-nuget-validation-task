import tl = require('azure-pipelines-task-lib/task');
import path = require("path");
import { internal } from './internal'
import {nugetValidations } from './nugetValidations'
import {Whitelist, nuget, validation, result} from './interfaces'
const parseXml = require('xml-parser');


export class main{

    private usePrereleaseNugets: boolean;
    private projects: string[] = ["**/packages.config", "**/*.props"];
    private data: any[] = [];
    private readonly buildSourceBranch: string = "Build.SourceBranch"; 


    constructor(){
        this.usePrereleaseNugets = tl.getBoolInput("usePrereleaseNugets", true);
    }
    
    public async execute() {
        try {
                var int = new internal();

                tl.setResourcePath(path.join(__dirname, "task.json"));
                var projectFiles = int.getProjectFiles(this.projects);

                tl.debug(`Found the following projects: ${JSON.stringify(projectFiles)}`)

                if (projectFiles.length === 0) {
                    throw new Error("noProjectFilesFound");
            }

            var validations = new nugetValidations();
            var branch = tl.getVariable(this.buildSourceBranch) || '';
            
            if(branch === '') throw  new Error("noBranchFound");
            
            projectFiles.forEach(file => {
                
                tl.debug(`Parsing the following fie: ${JSON.stringify(file)}`)

                var contents =  int.getFileContentsOrFailSync(file, { deepParse: true } )
                const xml = parseXml(contents);
                var data = int.parsePackagesInternal(xml);    
                if(data.length > 0)
                {
                    data.forEach(element => {
                        this.data.push(element);
                    });
                }     
                
                tl.debug(`Found the following packages: ${JSON.stringify(data)}`)
            });

            var result: result = { validations : [] };
            result.validations.push(validations.ValidateSameVersionsOnAllProjects(this.data));
            result.validations.push(validations.ValidatePreReleaseNugets(this.data, branch, this.usePrereleaseNugets ));
            result.validations.push(await validations.ValidateWhiteList(this.data));


            result.validations.forEach(item => {
                if(!item.isOk)
                {
                    tl.debug(`Validations result: ${JSON.stringify(item.message)}`)
                    throw new Error(JSON.stringify(result.validations));
                }
            });

            tl.debug(`Validations result: OK`)

        }
        catch (err) {
            console.log("ERROR: " + err);
            tl.setResult(tl.TaskResult.Failed, err.message);
        }
    }

    
}

try {
    var entry = new main();
    entry.execute();    
} catch (error) {
    tl.setResult(tl.TaskResult.Failed, error.message);
}

