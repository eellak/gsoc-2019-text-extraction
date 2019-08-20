import React, { Component } from 'react';
import clsx from 'clsx';
import FilesTab from './FilesTab'
import ScriptsTab from './ScriptsTab'
import Console from './Console'
import ResultsTab from './ResultsTab'
import { withStyles } from '@material-ui/styles';
import AppBar from "@material-ui/core/AppBar";
import Drawer from "@material-ui/core/Drawer";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import Button from "@material-ui/core/Button";
import FormControl from "@material-ui/core/FormControl";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";

// Basic styles for this component
const drawerWidth = 180;
const consoleHeight = 200;

// Export for Console style prop
export { consoleHeight };

const styles = theme => ({
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  drawerOpen: {
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerClose: {
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: theme.spacing(7) + 1,
  },
  tabs: {
    width: '100%',
    margin: `${theme.spacing(1)}px 0 0 0`,
    height: `calc(100% - 64px - ${theme.spacing(1)}px)`
  },
  toolbar: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: "relative"
  },
  contentWidthDrawerClosed: {
    width: `calc(100vw - ${theme.spacing(6)}px - ${theme.spacing(7)}px - 1px)`
  },
  contentWidthDrawerOpen: {
    width: `calc(100vw - ${theme.spacing(6)}px - ${drawerWidth}px)`
  },
  main: {
    display: "flex",
    height: "100vh",
  },

  container: {
    height: `calc(100% - ${consoleHeight}px)`,
    overflow: 'hidden'
  }
});

/* Main is the main application component, which is responsible for the render
* of everything the user can see on the main window and which stores
* and operates the majority of the tool's functionality
*/


class Main extends Component {
  /* State:
  * platform: information about the platform (for cross-platform use)
  * electron: electron instance, used to reach application's main window
  * isDev: the mode in which the application runs (production or development)
  * toExecute: object with the scripts that are to be executed
  * selectedFilePaths: array which stores the paths of input files
  */

  constructor(props) {
    super(props);
    this.state = {
      settings: props.electron.remote.require('electron-settings'),
      fs: window.require('fs'),
      ipc: props.electron.ipcRenderer,
      openDrawer: false,
      openSettings: false,
      tabIndex: 0,
      processing: false,
      files: [],
      selectedFilesPaths: [],
      selectedResultRows: [],
      selectedIndices: {},
      selectedCustomScripts: [],
      toExecute: {},
      resultList: [],
      additionalResults: [],
      resultOrder: {
        columnId: 0,
        by: 'name',
        asc: true
      },
      fileOrder: {
        columnId: 0,
        by: 'name',
        asc: true
      },
      savedScripts: [],
      savedScripts: [],
      logMessage: () => { }
    };
    this.state.ipc.on('receive-results', (event, arg) => {
      this.setDistantState({ resultList: arg });
    });

    this.state.ipc.on('receive-indices', (event, arg) => {
      this.setDistantState({ indices: arg });
    });

    this.state.ipc.on('receive-book', (event, arg) => {
      this.setDistantState({ files: arg });
    });

    this.state.ipc.on('receive-script', (event, arg) => {
      this.setDistantState({ savedScripts: arg });
    });
  }

  /* R environment is initialized immediately after startup*
  */

  componentDidMount() {
    this.setState({
      rPath: this.state.settings.get("rPath", "e.g. C:\\Program Files\\R\\R-3.6.0\\bin"),
      rlibPath: this.state.settings.get("rlibPath", "e.g. C:\\Users\\panos\\Documents\\R\\win-library\\3.6")
    })
    if (this.state.settings.get("firstTime") === false && 
    this.state.fs.existsSync(`${this.state.settings.get('rPath')}\\Rscript.exe`) &&  
    this.state.fs.existsSync(`${this.state.settings.get('rlibPath')}`)) {
      this.initializeR();
    }
    else {
      this.setState({ openSettings: true })
    }
    this.state.ipc.send('get-indices');
    this.state.ipc.send('get-book', { order: this.state.fileOrder });
    this.state.ipc.send('get-script');
  }

/*
 *
*/

initializeR = () => {
  const scriptPath = (() => {
    switch (this.props.platform) {
      case "win32":
        return '.\\src\\initializeR.R';
      case "linux":
      default:
        return './src/initializeR.R';
    }
  })()
  this.executeScript('built-in', `${this.state.settings.get("rPath", "")}\\Rscript`, scriptPath, [this.state.settings.get("rlibPath", "Rlibrary")]);
};

  /* executeScript:
  * call a script using the npm's child_process module
  */

  executeScript = (type, env, scriptPath, args = [], callback = undefined) => {
    if (env[0] === '\\') env = env.slice(1);

    // Copy args
    let newArgs = [...args];
    // Replace built in script argument with selected filepaths
    let replaceIndex = args.indexOf("-filePaths=")
    if (replaceIndex !== -1) {
      newArgs[replaceIndex] = newArgs[replaceIndex] + this.state.selectedFilesPaths.join(',');
    }
    // Replace custom script argument with selected filepaths
    replaceIndex = newArgs.indexOf("{filepaths}")
    if (replaceIndex !== -1) {
      newArgs[replaceIndex] = this.state.selectedFilesPaths;
    }
    const { spawn } = window.require('child_process');
    const process = spawn(env, [scriptPath].concat(newArgs));

    process.on('error', (error) => {
      this.setState({ error: true })
      this.state.logMessage(`Process could not be spawned or killed. Error message:\n ${error}`, 'error');
      if (callback !== undefined) {
        callback();
      }
    });
    
    // Send message to main process to add new book to database
    process.stdout.on('data', (data) => {
      console.log(`${data}`)
      if (['readability', 'lexdiv', 'misc'].indexOf(type) !== -1) {
        this.state.ipc.sendSync('add-results', { resultType: type });
        if (callback !== undefined) {
          callback();
        }
      }
    });


    // Call callback on exit (to resolve promise)
    process.on('exit', (code) => {
      if (code !== 0) {
        this.setState({ error: true })
      }
      this.state.logMessage(`Finished execution of ${scriptPath} ${code === 0 ? 'successfully' : 'unsuccessfully'}`, 'error');
      console.log(`child process exited with code ${code}`);
      if (callback !== undefined) {
        callback();
      }
    });
  }
  /* executeAll:
  * execute every script that currently is in the state's
  * toExecute object and in addition, calculates tokens and types of selected
  * files. The execution is done by creating a promise that
  * calls executeScript function and thus, it is all done in an
  * asynchronous manner.
  */
  executeAll = () => {
    if (!this.state.fs.existsSync('temp')) {
      this.state.fs.mkdirSync('temp');
    }

    let promises = [];
    this.setState({ processing: true, error: false });
    const createAsync = execObj => {
      return new Promise((resolve, reject) => {
        this.state.logMessage(`Start execution of ${execObj.scriptPath}`, 'info');
        this.executeScript(execObj.type, execObj.env, execObj.scriptPath, execObj.args, () => resolve());
      });
    };

    this.state.selectedCustomScripts.map(scriptName => {
      // Maybe do a database call. Too silly
      const script = this.state.savedScripts.filter(scriptObj => scriptObj.name === scriptName)[0];
      promises.push(createAsync({
        type: 'custom',
        env: script.env,
        scriptPath: script.path,
        args: script.args
      }))
    })

    let addFreqAnalysis = true;
    Object.keys(this.state.toExecute).map((execKey) => {
      if (execKey === "misc") {
        const toExecute = this.state.toExecute;
        toExecute[execKey].args[2] = toExecute[execKey].args[2] + ",tokens,vocabulary";
        this.setState({ toExecute: toExecute });
        addFreqAnalysis = false;
      }
      promises.push(createAsync(this.state.toExecute[execKey]));
    });

    // Make tokens and types calculation compulsory
    if (addFreqAnalysis === true) {
      promises.push(createAsync({
        type: 'misc',
        env: `${this.state.settings.get("rPath", "")}\\Rscript`,
        scriptPath: (() => {
          switch (this.state.platform) {
            case "win32":
              return "src\\Built-in\\misc\\misc_indices.R";
            case "linux":
            default:
              return "src/Built-in/misc/misc_indices.R";
          }
        })(),
        args: [`${this.state.settings.get("rlibPath")}`].concat(`-filePaths=${this.state.selectedFilesPaths.join(',')}`).concat(`-index=tokens,vocabulary`)
      }))
    }

    /* When every script has finished execution, fetch results and
    * enable button
    */
    Promise.all(promises)
      .then(() => {
        this.getResults(this.state.resultOrder);
        this.state.logMessage(`Get results`, 'info');
        this.setState({
          processing: false,
          resultOrder:
          {
            columnId: 0,
            by: 'name',
            asc: true
          }
        });
      });
  };

  getResults = (order, filePaths = this.state.selectedFilesPaths, indices = this.state.selectedIndices) => {
    this.state.ipc.send('get-results', {
      filePaths: filePaths,
      indices: indices,
      order: order
    });
  };

  // Change view tab according to user's selection
  changeTab = (tabIndex) => {
    this.setState({ tabIndex: Number(tabIndex) })
  };

  // Open/close side drawer
  handleDrawerToggle = () => {
    this.setState({ openDrawer: !this.state.openDrawer });
  };

  /* Method that is passed to children components in order
  * to change the state of this component
  */
  setDistantState = (obj) => {
    this.setState(obj);
  };

  /* Method that is passed to children in order to
  * add a new script to be executed
  */
  setScriptParameters = (remove, type, env, scriptPath, args) => {
    let toExecute = this.state.toExecute;
    if (remove) delete toExecute[type];
    else {
      toExecute[type] = { type: type, env: env, scriptPath: scriptPath, args: args }
      this.setState({ toExecute: toExecute });
    }
  };

  addPathDialog = (obj) => {
    const { type, placeholder } = obj;
    const path = require('path');
    const dialog = this.props.electron.remote.dialog;
    dialog.showOpenDialog(this.props.electron.remote.getCurrentWindow(),
      {
        title: `Select folder path e.g. ${placeholder}`,
        properties: ['openDirectory']
      },
      (folderPath) => {
        if (folderPath !== undefined) {
          folderPath = folderPath[0];
          this.state.settings.set(type, folderPath)
          this.setState({[type]: folderPath})
        }
      }
    );
  };

  handleClose = () => {
    this.setState({ openSettings: false });
    this.initializeR();
  };

  render() {
    const classes = this.props.classes;
    const theme = this.props.theme;
    return (
      <div>
        <Dialog disableBackdropClick disableEscapeKeyDown open={this.state.openSettings} onClose={this.handleClose}>
          <DialogTitle>Fill every field</DialogTitle>
          <DialogContent>
           {/* <input type="text" value={this.state.settings.get('rPath', "")} readOnly /><button onClick={this.addFilesDialog} id="r-path">...</button> */}

            <form className={classes.container}>
                <Button className={classes.customButton} onClick={() => this.addPathDialog({type: 'rPath', placeholder: "C:\\Program Files\\R\\R-3.6.0\\bin"})}>
                  <TextField
                  required
                  error={!this.state.fs.existsSync(`${this.state.settings.get('rPath')}\\Rscript.exe`)}
                    label="R bin directory"
                    value={this.state["rPath"]}
                    className={classes.textField}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Button>
                <Button className={classes.customButton} onClick={() => this.addPathDialog({type: 'rlibPath', placeholder: "C:\\Users\\panos\\Documents\\R\\win-library\\3.6"})}>
                  <TextField
                  required
                  error={!this.state.fs.existsSync(this.state.settings.get('rlibPath'))}
                    label="R library directory"
                    value={this.state["rlibPath"]}
                    className={classes.textField}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Button>
            </form>
          </DialogContent>
          <DialogActions>
            <Button 
            onClick={this.handleClose} 
            disabled={!this.state.fs.existsSync(`${this.state.settings.get('rPath')}\\Rscript.exe`) || !this.state.fs.existsSync(this.state.settings.get('rlibPath'))} 
            color="primary">
              Save
          </Button>
          </DialogActions>
        </Dialog>

        <AppBar
          position="fixed"
          className={clsx(classes.appBar)}
        >
          <Toolbar>
            <Typography variant="h6" noWrap>
              Text Extraction Tool
          </Typography>
          </Toolbar>
        </AppBar>
        <main className={clsx(classes.main)}>
          <Drawer
            variant="permanent"
            className={clsx(classes.drawer, {
              [classes.drawerOpen]: this.state.openDrawer,
              [classes.drawerClose]: !this.state.openDrawer,
            })}
            classes={{
              paper: clsx({
                [classes.drawerOpen]: this.state.openDrawer,
                [classes.drawerClose]: !this.state.openDrawer,
              }),
            }}
            open={this.state.openDrawer}
          >
            <div className={classes.toolbar} />
            <IconButton
              color='primary'
              onClick={this.handleDrawerToggle}
              className={clsx({ [classes.hide]: !this.state.openDrawer })}
            >
              <i className="material-icons">chevron_left</i>
            </IconButton>
            <IconButton
              color='primary'
              onClick={this.handleDrawerToggle}
              className={clsx({ [classes.hide]: this.state.openDrawer })}
            >
              <i className="material-icons">chevron_right</i>
            </IconButton>
            <List>
              {['Input', 'Scripts', 'Results'].map((text, index) => {
                const iconstList = [
                  <i className="material-icons">add_box</i>,
                  <i className="material-icons">insert_drive_file</i>,
                  <i className="material-icons">signal_cellular_4_bar</i>];

                return (<ListItem
                  button
                  key={text}
                  selected={this.state.tabIndex === index}
                  onClick={() => this.changeTab(index)}
                >
                  <ListItemIcon>
                    {iconstList[index]}
                  </ListItemIcon>
                  <ListItemText
                    primary={text}
                  />
                </ListItem>
                )
              })}
            </List>
          </Drawer>
          <div className={clsx(classes.content, { [classes.contentWidthDrawerClosed]: !this.state.openDrawer, [classes.contentWidthDrawerOpen]: this.state.openDrawer })}>
            <div className={classes.container}>
              <div className={classes.toolbar} />
              <div className={clsx(classes.tabs, classes.correctHeight)}>
                {this.state.tabIndex === 0 && <FilesTab
                  fs={this.state.fs}
                  ipc={this.state.ipc}
                  electron={this.props.electron}
                  platform={this.props.platform}
                  isDev={this.props.isDev}
                  setDistantState={this.setDistantState}
                  files={this.state.files}
                  selectedFilesPaths={this.state.selectedFilesPaths}
                  order={this.state.fileOrder}
                  logMessage={this.state.logMessage}
                />}
                {this.state.tabIndex === 1 && <ScriptsTab
                  fs={this.state.fs}
                  ipc={this.state.ipc}
                  electron={this.props.electron}
                  platform={this.props.platform}
                  isDev={this.props.isDev}
                  setDistantState={this.setDistantState}
                  selectedCustomScripts={this.state.selectedCustomScripts}
                  indices={this.state.indices}
                  selectedIndices={this.state.selectedIndices}
                  settings={this.state.settings}
                  setScriptParameters={this.setScriptParameters}
                  savedScripts={this.state.savedScripts}
                  logMessage={this.state.logMessage}
                />}
                {this.state.tabIndex === 2 && <ResultsTab
                  error={this.state.error}
                  fs={this.state.fs}
                  ipc={this.state.ipc}
                  electron={this.props.electron}
                  setDistantState={this.setDistantState}
                  executeAll={this.executeAll}
                  selectedResultRows={this.state.selectedResultRows}
                  order={this.state.resultOrder}
                  processing={this.state.processing}
                  getResults={this.getResults}
                  additionalResults={this.state.additionalResults}
                  resultList={this.state.resultList}
                  logMessage={this.state.logMessage}
                />}
              </div>
            </div>
            <Console
              consoleHeight={consoleHeight}
              setDistantState={this.setDistantState}
              logMessage={this.state.logMessage} />
          </div>
        </main>

      </div >
    );
  }
};

export default withStyles(styles, { withTheme: true })(Main);