const fs = require('fs-extra');
const isBuffer = require('is-buffer');
const StringDecoder = require('string_decoder').StringDecoder;
import tl = require('azure-pipelines-task-lib/task');

export class internal{
    
  private newLine = /\r|\n/g;
  private defaultOptions = {
    encoding: 'utf-8'
  }

  isVsFileContents(file: any){
      return (typeof file === 'string' && this.newLine.test(file));
  };

  fileExistsSync = (filePath: any) => fs.pathExistsSync(filePath);


  getFileContentsOrFailSync(file: any, options: any){

    if(this.isVsFileContents(file)) {
      return file;
    }
  
    const myOptions = (options && Object.assign({}, options, this.defaultOptions)) || this.defaultOptions;
  
    if (isBuffer(file)) {
      const decoder = new StringDecoder(myOptions.encoding);
      return decoder.write(file);
    }
  
    try {
      return fs.readFileSync(file, myOptions);
    } catch (e) {
      if (typeof file === 'string' && !this.fileExistsSync(file)) {
        throw new Error('File not found: ' + file);
      } else {
        throw e;
      }
    }
  }

  parsePackagesInternal(xml: any) {
   
    var result: any[] = [];

    xml.root.children.forEach((packageNode: any) => {
      if(packageNode.name === 'package') {
        const parsedPackage = {
          name: packageNode.attributes.id,
          version: packageNode.attributes.version,
        };             
        result.push(parsedPackage);
      }
      else if (packageNode.name === 'ItemGroup') {
        const children = packageNode.children;
        if (children && children.length) {
          
          children.forEach((element: { name: string; attributes: { Update: any; Version: any; }; }) => {
            if(element.name == 'PackageReference')
            {
              const parsedPackage = {
                name: element.attributes.Update,
                version: element.attributes.Version,
              };             
              result.push(parsedPackage);
            }
          });
  
        }
      }
    });

    return result;
  }

  getProjectFiles(projectPattern: string[]): string[] {
    if (projectPattern.length == 0) {
        return [""];
    }
    var projectFiles: string[] = tl.findMatch(tl.getVariable("System.DefaultWorkingDirectory") || process.cwd(), projectPattern);

    if (!projectFiles || !projectFiles.length) {
        return [];
    }

    return projectFiles;
}
}