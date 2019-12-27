import tl = require('azure-pipelines-task-lib/task');
import path = require("path");
import {dotnetValidations} from './dotnet/dotnetValidations'
import {result, validation} from './common/interfaces'



export class main{

    private usePrereleaseNugets: boolean;
    private readonly buildSourceBranch: string = "Build.SourceBranch"; 

    constructor(){
        this.usePrereleaseNugets = tl.getBoolInput("usePrereleaseNugets", true);
    }
    
    public async execute() 
    {
        try 
        {
            tl.debug("Starting custom nuget validations task");

            tl.setResourcePath(path.join(__dirname, "task.json"));
        
            //Commit must come from any branch
            var branch = tl.getVariable(this.buildSourceBranch) || '';
            if(branch === '') 
                throw  new Error("noBranchFound");

            var result : result = { validations: [  ]}                       
            
            //Dotnet validations
            var dotnet_validations = new dotnetValidations();
            result = await dotnet_validations.Validate(branch, this.usePrereleaseNugets);

            //Future validations
                    
            //Parse result validations
            var found_error : boolean = false;      
            result.validations.forEach((item : validation) => {
                if(item.isOk === false)
                {
                    tl.error(`Validation error: ${JSON.stringify(item.message)}`);
                    found_error = true;
                }
            });

            if(found_error === (true as Boolean))
            {
                throw new Error("Validations failed");
            }

            tl.debug(`Validations result: OK`);

        }
        catch (err) {
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

