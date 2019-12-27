import tl = require('azure-pipelines-task-lib/task');
import { internal } from '../common/internal'
const parseXml = require('xml-parser');

export class dotnetParser{

    private projects: string[] = ["**/packages.config", "**/*.props", "**/*.csproj"];


    getModel() : any {

        var int = new internal();
        var data: any[] = [];
        var projectFiles = int.getProjectFiles(this.projects);

        if (projectFiles.length === 0){
            tl.debug("No files found for dotnet parsing");
            return;
        }

        tl.debug(`Found the following projects: ${JSON.stringify(projectFiles)}`);

        projectFiles.forEach(file => {
                    
            tl.debug(`Parsing the following fie: ${JSON.stringify(file)}`)

            var contents =  int.getFileContentsOrFailSync(file, { deepParse: true } )
            const xml = parseXml(contents);
            var packages = int.parsePackagesInternal(xml);    
            if(packages.length > 0)
            {
                packages.forEach(element => {
                    data.push(element);
                });
            }     
            tl.debug(`Found the following packages: ${JSON.stringify(data)}`)
        });

        return data;

    }

}