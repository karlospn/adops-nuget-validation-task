import tl = require('azure-pipelines-task-lib/task');
import { Base64 } from 'js-base64';
const request = require('request-promise-native');
import {Whitelist, nuget, validation, result, nugetCandidates} from './interfaces'


export class nugetValidations {

    ValidateSameVersionsOnAllProjects(nugets: any[]) : validation
    {

        tl.debug(`Validating nuget versions`)

        nugets.forEach(outer => {
            nugets.forEach(inner =>{

                if (outer.name.toLowerCase() === inner.name.toLowerCase() && outer.version != inner.version)
                    return {isOk: false, message: `ERROR: Nuget ${outer.name} with versions ${inner.version} and ${outer.version}`};
                
            });
        });        
        return {isOk: true, message: ""};
    }

    ValidatePreReleaseNugets(nugets: any[], branch: string, usePrereleaseNugets: boolean) : validation
    {
        tl.debug(`Validating pre-release nugets`)
        tl.debug(`Skip prerelease nugets activated: ${usePrereleaseNugets}`)

        if(usePrereleaseNugets)
            return {isOk: true, message: ""};

        nugets.forEach(nuget => {
            var splitted = nuget.version.split("-")
            if(splitted.length > 1)
                return {isOk: false, message: `ERROR: Nuget ${nuget.name} contains pre-release version ${nuget.version}`};            
        });

        return {isOk: true, message: ""};    
    }

    async ValidateWhiteList(nugets: any[]): Promise<validation>
    {
        tl.debug(`Validating Whitelist`)

        var whitelist : Whitelist = await this.GetWhitelistAsync();

        tl.debug(`Whitelist found. Printing content: ${JSON.stringify(whitelist)}`)
        
        if(whitelist.nugets == null || whitelist.nugets.length == 0)
            throw  new Error("Empty or malformed manifest");


        for(var k = 0; k < nugets.length; k++)
        {

            var candidates_list : nugetCandidates[] = [];
            var tokenize_nuget = nugets[k].name.toLowerCase().split(".");

            whitelist.nugets.forEach(whitelisted => 
            { 
                var miss = false;
                var tokenize_whitelist = whitelisted.name.toLowerCase().split(".");

                if(tokenize_whitelist.length == 0)
                    throw new Error(`ERROR: Malformed whitelist. Cannot tokenize ${whitelisted.name} `);

                if(tokenize_whitelist[0] === "*")
                    throw new Error(`ERROR: Malformed whitelist. The whitelist contains a wildcard at root level `);    
  
                for(var i = 0; i< tokenize_nuget.length; i++)
                {
                    if(tokenize_whitelist[i] != tokenize_nuget[i] && tokenize_whitelist[i] != "*")
                    {
                        miss = true;
                        break;
                    }
                                       
                    if(tokenize_whitelist[i] === "*")
                        break; 
                }

                if(!miss)
                {
                    var sum = 0;
                    tokenize_whitelist.forEach(element => { if(element != "*") sum = sum + 1; });
                    candidates_list.push({name: whitelisted.name, version: whitelisted.version, scoring: sum })
                }

            });

            if(candidates_list.length == 0)
            {
                return {isOk: false, message: `ERROR: Nuget ${nugets[k].name} with version ${nugets[k].version} is not whitelisted`};
            }
            else
            {
                candidates_list.sort((a, b) => (a.scoring < b.scoring) ? 1 : -1)
                var valid_version = this.ValidateVersion(candidates_list[0].version, nugets[k]);
                if(!valid_version) 
                    return {isOk: false, message: `ERROR: nuget ${nugets[k].name} with version ${nugets[k].version} is not whitelisted`};

            }

        }
        return {isOk: true, message: ""};
    }


    ValidateVersion(whitelisted_versions: string[], nuget: any)
    {
        if(whitelisted_versions === undefined)
            return true;

        if(whitelisted_versions.length == 0)
            throw new Error(`ERROR: Malformed whitelist. ${nuget.name} contains and empty versions array`)

        else
        {
            var tokenize_version = nuget.version.split(".")

            for(var i = 0; i < whitelisted_versions.length; i++ )
            {                
                var miss = false;
                var tokenize_whitelist_version = whitelisted_versions[i].split(".");
                for(var j = 0; j < tokenize_version.length; j ++)
                {
                    if(tokenize_version[j] != tokenize_whitelist_version[j] && tokenize_whitelist_version[j] != "*")
                    {
                        miss = true;
                        break;
                    }

                    if(tokenize_whitelist_version[j] === "*")
                        return true;
                }

                if(!miss)
                {
                    return true;
                }    
            };
            return false;
        }
    }

    getSystemAccessToken(): string {
        tl.debug('Getting credentials for local feeds');
        let auth = tl.getEndpointAuthorization('SYSTEMVSSCONNECTION', false);
        if (auth!.scheme === 'OAuth') {
            tl.debug('Got auth token');
            return auth!.parameters['AccessToken'];
        } else {
            throw new Error('ERROR: Could not determine credentials to use');
        }
    }

    async GetWhitelistAsync() {
        
        tl.debug(`Calling Azure DevOps Api`)
        let accessToken = this.getSystemAccessToken()
        if(accessToken === "")
            throw new Error("accessTokenNotFound");
        const options = {
            //Change it for your repository
            url: 'https://dev.azure.com/carlos/Lab/_apis/git/repositories/WhitelistRepository/items?path=whitelist.json&download=true&_a=content&api-version=5.1',
            headers: {
              'Authorization': `Basic ${Base64.encode(":" + accessToken)}`
            }
        };

        return request(options).then((result:any) => {

            var whitelist: Whitelist = JSON.parse(result);
            return whitelist;

        }).catch((error:any) => {

            throw new Error(error.message);

        });
        
    }
}
