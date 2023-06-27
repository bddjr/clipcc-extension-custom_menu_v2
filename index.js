const { Extension, type, api } = require('clipcc-extension');

/**@type {any}*/
const vm = api.getVmInstance();

/**@type {string}*/
const extension_id = require('./extension_id.js');
const category_id = `${extension_id}.category`;
const category_menus_id = `${extension_id}.menus`;
const category_color = '#ce00ff';

/** 扩展模块加载过了？ */
var loaded_category = false;

/** 错误信息 */
var err_msg = '';

/** 用于计算删除菜单冷却时间的记录值，即上一次执行完的时候的时间戳 */
var del_menu_cdtime_from = -Infinity;

//===========================================================================

/**
 * my_log_block_error( util.currentBlock.id, util.currentBlock.opcode, e )
 * @param {string} block_id 
 * @param {string} block_opcode
 */
function my_log_block_error(block_id, block_opcode, error){
    let err_str = 'ClipCCExtensionBlockError\n' + (
        err_msg = 
`{"extension":"${extension_id}",
"blockid":${JSON.stringify(block_id)},
"opcode":${JSON.stringify(block_opcode)},
"time":${Date.now()},
"error":${JSON.stringify(error.toString())}}`
    );
    console.error( err_str );
    console.error( error );
    return err_str;
}

//===========================================================================

var menus = {
    //name: [['name','value']]
};

//===========================================================================

function check_menu_list( menu_list ){//2.0.0
    if( typeof menu_list === 'object' ){
        // 断开对象指针
        menu_list = JSON.stringify( menu_list );
    }
    menu_list = JSON.parse( menu_list );

    if( !Array.isArray(menu_list) ){
        throw 'menu_list is not a Array!';
    }
    if( menu_list.length === 0 ){
        return [['','']];
    }
    for( let i in menu_list ){ //遍历每一项检查
        let J = menu_list[i];
        if( Array.isArray(J) ){ //是数组
            //长度必须是2
            if( J.length !== 2 ) 
                throw `menu_list ${i} length not allowed!`;

            // 第1项必须是字符串或数
            if( !['string','number'].includes(typeof J[1]) ) 
                throw `menu_list ${i} item 1 type not allowed!`;

            // 第0项不是字符串就转成字符串
            if( typeof J[0] !== 'string' )
                J[0] = String(J[0]);

        }else if( ['string','number'].includes(typeof J) ){ //是字符串或数
            menu_list[i] = [
                String(J[0]),
                J[1]
            ];

        }else throw `menu_list ${i} type not allowed!`;
    }
    return menu_list;
}

//===========================================================================

/**
 * @param {string} name
 */
function check_name( name ){
    return String(name).trim().replace(
        new RegExp('[\\[\\]\\{\\}\\"\\&\\\'\\%\\<\n\r\t\b\f]', 'g') ,
        '_'
    );
}

//===========================================================================

/**
 * @param {string} name
 */
function add_menu_block( name ){//2.0.0
    let blockID = `${category_menus_id}.menu_block.${name}`;
    api.removeBlock( blockID );
    api.addBlock({
        opcode: blockID,
        messageId: `${name}[v]`,
        categoryId: category_menus_id,
        type: type.BlockType.REPORTER,
        param: {
            v:{
                type: type.ParameterType.STRING,
                // @ts-ignore
                menu: ()=> menus[ name ]
            }
        },
        function: a=>a.v
    });
}

//=====================================================================================================================
//=====================================================================================================================

const blocks = [
//===========================================================================
    // 创建一个不能被程序触发的积木，点击它就会直接跳转到github仓库地址。
    {//2.0.0
        opcode: `${category_id}.jumptogithub`,
        messageId: `${category_id}.jumptogithub`,
        categoryId: category_id,
        type: undefined,
        function: (args,util)=>{
            if(window.confirm("你确定要跳转到github吗？")){ //弹窗确认
                window.open("https://github.com/bddjr/clipcc-extension-custom_menu_v2");
            }
        }
    },
//===========================================================================
    {//2.0.0
        opcode: `${category_id}.readme`,
        messageId: `${category_id}.readme`,
        categoryId: category_id,
        type: type.BlockType.REPORTER,
        function: ()=>
`language: zh-cn
该扩展会往项目文件里自动存入菜单数据，因此如果不是动态菜单，只需要一次生成即可。

若一个菜单正在被使用，请不要删除它！

set menu 可以填入以下形式：
[["one",1],["two","2"],"test",123456]

menu积木名称不支持以下符号，它们都将被替换为_
[]{}"&'%<
还有一些特殊符号也不支持，它们也会被替换为_
\\n\\r\\t\\b\\f`
    },
//===========================================================================
    {//2.0.0
        opcode: `${category_id}.set_menu`,
        messageId: `${category_id}.set_menu`,
        categoryId: category_id,
        type: type.BlockType.COMMAND,
        param: {
            name:{
                type: type.ParameterType.STRING,
                default: 'my_menu'
            },
            list:{
                type: type.ParameterType.STRING,
                default: '[ ["one","1"], ["two","2"], ["three","3"] ]'
            },
        },
        function: (args,util)=>{
            try{
                let name = check_name( args.name );

                if(menus.hasOwnProperty( name )){
                    menus[ name ] = check_menu_list( args.list );
                }else{
                    menus[ name ] = check_menu_list( args.list );
                    add_menu_block( name );
                }
            }catch(e){
                return my_log_block_error( util.currentBlock.id, util.currentBlock.opcode, e )
            }
        }
    },
//===========================================================================
    {//2.0.0
        opcode: `${category_id}.delete_menu`,
        messageId: `${category_id}.delete_menu`,
        categoryId: category_id,
        type: undefined,
        param: {
            name:{
                type: type.ParameterType.STRING,
                menu: ()=>{
                    /**@type {any[]}*/
                    let ls = Object.keys( menus );
                    if( ls.length === 0 ){
                        return [['','']];
                    }
                    for(let i in ls){
                        ls[i] = [
                            ls[i],
                            ls[i]
                        ];
                    }
                    return ls;
                }
            },
        },
        function: (args,util)=>{
            // 检查冷却时间
            let cdtime_count = Date.now() - del_menu_cdtime_from;
            if( cdtime_count < 800 ){
                return `Please wait ${
                    (
                        (800 - cdtime_count) / 1000
                    ).toFixed(3)
                } second, then retry.`
            }

            let name = check_name( args.name );
            if(
                menus.hasOwnProperty(name)
                &&
                window.confirm(`Delete menu ${name}`) //弹窗确认
            ){
                // 尝试删除（不会报错）
                api.removeBlock(`${category_menus_id}.menu_block.${name}`);
                Reflect.deleteProperty(
                    menus,
                    name
                );
            }

            del_menu_cdtime_from = Date.now();
        }
    },
//===========================================================================
    {//2.0.0
        opcode: `${category_id}.error`,
        messageId: `${category_id}.error`,
        categoryId: category_id,
        type: type.BlockType.REPORTER,
        function: ()=> err_msg
    },
//===========================================================================
    {//2.0.0
        opcode: `${category_id}.menus_json`,
        messageId: `${category_id}.menus_json`,
        categoryId: category_id,
        type: type.BlockType.REPORTER,
        function: ()=> JSON.stringify( menus )
    },
//===========================================================================

];

//=====================================================================================================================
//=====================================================================================================================

function load_category(){
    api.removeCategory( category_id );
    api.addCategory({
        categoryId: category_id,
        messageId: category_id,
        color: category_color
    });
    // @ts-ignore
    api.addBlocks( blocks );

    api.removeCategory( category_menus_id );
    api.addCategory({
        categoryId: category_menus_id,
        messageId: category_menus_id,
        color: category_color
    });

    loaded_category = true;
}

//=====================================================================================================================
//=====================================================================================================================

module.exports = class extends Extension{

//===========================================================================
    onUninit(){//2.0.0
        api.removeCategory( category_id );
        api.removeCategory( category_menus_id );
        loaded_category = false;
    }

//===========================================================================

    onInit(){//2.0.0
        console.log(`${extension_id} onInit`);

        if( !loaded_category ){
            load_category();
            for( let i in menus ){
                //遍历添加积木
                add_menu_block(i); 
            }
        }
    }

//===========================================================================

    beforeProjectSave(data){//2.0.0
        // 用于保存菜单
        console.log('extension_bddjr_custom_menu_v2_data save');

        let json = JSON.stringify( menus );
        if(json === '{}'){
            // menus为空，则无需保存
            Reflect.deleteProperty(
                data.projectData.targets[0].blocks ,
                'extension_bddjr_custom_menu_v2_data'
            );
        }else{
            // 重新创建这个积木，保存内容
            data.projectData.targets[0].blocks.extension_bddjr_custom_menu_v2_data = {
                "opcode": "operator_length", //获取字符串长度的积木
                "next": null,
                "parent": null,
                "inputs": {
                    "STRING": [
                        1,
                        [
                            10,
                            "extension_bddjr_custom_menu_v2_data" + json
                        ]
                    ]
                },
                "fields": {},
                "shadow": true, //隐藏积木
                "topLevel": true,
                "x": 0,
                "y": 0
            };
        }
    }

//===========================================================================

    beforeProjectLoadExtension(targets, extensions){//2.0.0
        // 用于加载菜单数据
        console.log('extension_bddjr_custom_menu_v2_data load');

        // 加载模块
        load_category();

        try{
            // 读取数据字符串
            // 这里的target结构与保存时的target不一样，需要特殊适配。
            const blocks = targets[0].blocks._blocks;
            if( !blocks.extension_bddjr_custom_menu_v2_data ){ //undefined
                // 找不到这个积木，通常是因为本来就是空的
                console.log('extension_bddjr_custom_menu_v2_data load undefined');
            }else{
                // 找得到这个积木，继续找内容
                let str = blocks[
                    blocks.extension_bddjr_custom_menu_v2_data.inputs.STRING.block
                ].fields.TEXT.value;

                // 读取字符串转对象，覆盖原来的变量
                menus = JSON.parse(
                    str.slice( str.indexOf('{') )
                );

                for( let i in menus ){
                    //遍历添加积木
                    add_menu_block(i); 
                }

                return; // 退出函数
            }
        }catch(e){
            console.error("extension_bddjr_custom_menu_v2_data can't load");
            console.error(e);
        }
        
        // 还没退出函数？覆盖为空对象
        menus = {};
    }

//===========================================================================

}
