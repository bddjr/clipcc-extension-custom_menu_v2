# clipcc extension custom menu v2

![./assets/icon.webp](./assets/icon.webp)

自定义菜单v2  

> 不觉得这很酷吗？  

***
## 截图

![](README-pic/屏幕截图%202023-07-04%20171814.png)  

***
## 拉取并打包
（待验证）  

演示环境：Windows 的 powershell  

请在对应目录打开 powershell ，再执行如下操作。  

1、使用 git 从 github 仓库拉取内容。  
> 如果你需要提交 Pull Request ，请 fork 为自己的仓库，再从自己的仓库拉取。
```
git clone https://github.com/bddjr/clipcc-extension-bddjr_toolbox_v2
cd clipcc-extension-bddjr_toolbox_v2
```

2、（非必要）删除 .git 文件夹
> 如果你需要提交 Pull Request ，请不要执行这个
```
rm .git
```

3、使用 nodejs 的 npm 全局安装 yarn  
```
npm -g install yarn
```

4、使用 yarn 安装前置插件
```
yarn install
yarn install clipcc-extension
```

5、使用 yarn 打包
```
yarn build
```
