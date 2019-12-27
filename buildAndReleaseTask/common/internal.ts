const fs = require('fs-extra');
const isBuffer = require('is-buffer');
const StringDecoder = require('string_decoder').StringDecoder;
import tl = require('azure-pipelines-task-lib/task');
import {nuget} from './interfaces'

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

  parsePackagesInternal(xml: any) : nuget[] {
   
    var result: any[] = [];

    xml.root.children.forEach((packageNode: any) => {
      if(packageNode.name === 'package') {
        if (packageNode.attributes.id != undefined && 
            packageNode.attributes.version != undefined)
        {
          const parsedPackage = {
            name: packageNode.attributes.id,
            version: packageNode.attributes.version,
          };             
          result.push(parsedPackage);
        }
      }
      else if (packageNode.name === 'ItemGroup') {
        const children = packageNode.children;
        if (children && children.length) {     
          children.forEach((element: any) => {
            if(element.name == 'PackageReference')
            {
              if (element.attributes.Update != undefined && 
                element.attributes.Version != undefined)
                {
                  const parsedPackage = {
                    name: element.attributes.Update,
                    version: element.attributes.Version,
                  };             
                  result.push(parsedPackage);
                }
              else if (element.attributes.Include != undefined && 
                element.attributes.Version != undefined)
                  {
                    const parsedPackage = {
                      name: element.attributes.Include,
                      version: element.attributes.Version,
                    };             
                    result.push(parsedPackage);
                  }
            
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

  removeDuplicates(arr: any) {

    const result = [];
    const duplicatesIndices = [];

    // Loop through each item in the original array
    arr.forEach((current, index) => {
    
        if (duplicatesIndices.includes(index)) return;
    
        result.push(current);
    
        // Loop through each other item on array after the current one
        for (let comparisonIndex = index + 1; comparisonIndex < arr.length; comparisonIndex++) {
        
            const comparison = arr[comparisonIndex];
            const currentKeys = Object.keys(current);
            const comparisonKeys = Object.keys(comparison);
            
            // Check number of keys in objects
            if (currentKeys.length !== comparisonKeys.length) continue;
            
            // Check key names
            const currentKeysString = currentKeys.sort().join("").toLowerCase();
            const comparisonKeysString = comparisonKeys.sort().join("").toLowerCase();
            if (currentKeysString !== comparisonKeysString) continue;
            
            // Check values
            let valuesEqual = true;
            for (let i = 0; i < currentKeys.length; i++) {
                const key = currentKeys[i];
                if ( current[key] !== comparison[key] ) {
                    valuesEqual = false;
                    break;
                }
            }
            if (valuesEqual) duplicatesIndices.push(comparisonIndex);
            
        } // end for loop

    }); // end arr.forEach()
  
    return result;
  }
}