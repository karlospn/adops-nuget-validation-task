import {dotnetParser } from './dotnetParser'
import {result} from '../common/interfaces'
import {nugetValidations} from './nugetValidations'
import {internal} from '../common/internal'


export class dotnetValidations {

    async Validate(branch: any, usePrereleaseNugets: any) : Promise<result> {
        var parser = new dotnetParser();
        var validations = new nugetValidations();
        var int = new internal();
        //We don't care about duplicates.
        var data = int.removeDuplicates(parser.getModel());
        var result = await validations.Validate(data, branch, usePrereleaseNugets);
        return result;
    }
}