import React, { Component } from 'react';
import clsx from 'clsx';
import { withStyles } from '@material-ui/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Button from '@material-ui/core/Button';
import MenuList from '@material-ui/core/MenuList';
import MenuItem from '@material-ui/core/MenuItem';
import { Checkbox, Typography, Tabs, Tab, ListItem, ListItemText, IconButton } from '@material-ui/core';
import { List, AutoSizer } from 'react-virtualized'

const styles = theme => ({
    listRow: {
        'border-bottom': '1px solid rgba(224, 224, 224, 1)'
    },
    paper: {
        overflowX: 'auto'
    },
    table: {
        width: "100%",
    },
    tableWrapper: {
        overflowX: 'auto',
    },
    disabled: {
        opacity: "0.6",
        "background-color": "black",
        cursor: "default",
        "background- color": "#148340"
    },
    link: {
        cursor: 'pointer',
        'text-decoration': 'underline',
        width: 'fit-content'
    },
    listBox: {
        height: '200px'
    },
    export: {
        marginTop: '24px'
    }

});

class ResultsTab extends Component {
    constructor(props) {
        super(props);
        this.state = {
            anchorRef: React.createRef(null),
            open: false,
            exportTypes: [
                {
                    type: 'csv',
                    displayName: 'CSV'
                }, {
                    type: 'json',
                    displayName: 'JSON'
                }, {
                    type: 'txt',
                    displayName: 'Text'
                }],
            selectedExportType: {
                type: 'csv',
                displayName: 'CSV'
            },
            tabIndex: 0,
            tabs: props.additionalResults.map(resultObj => this.generateWordListElement(resultObj.wordList))
        };
        this.resultTable = [];
    }

    componentDidMount() {
        this.setResults();
    }

    // pass by value
    // TODO : find better way?
    componentDidUpdate(prevProps) {
        if (prevProps.resultList !== this.props.resultList) {
            this.setResults();
            this.props.setDistantState({ selectedResultRows: [...Array(this.props.resultList.length).keys()] });
        }
    }

    setResults = () => {
        let resultList = [];
        this.props.resultList.forEach(elem => {
            resultList.push(Object.assign([], elem));
        });
        resultList.forEach(bookObj => {
            const indices = bookObj.indices;
            delete bookObj.indices;
            delete bookObj.path
            Object.keys(indices).map(index => {
                if (indices[index].length !== 0)
                    bookObj[index] = indices[index];
            });
            return bookObj
        });
        this.setState({ resultList: resultList })
    }

    // Change view tab according to user's selection
    changeTab = (tabIndex) => {
        this.setState({ tabIndex: Number(tabIndex) })
    };

    sortByColumn = (indexName, columnId) => {
        if (indexName !== 'name') {
            indexName = 'indices.' + indexName;
        }
        let newOrder = {};
        if (this.props.order.columnId === columnId) {
            newOrder = {
                columnId: columnId,
                by: indexName,
                asc: !this.props.order.asc
            };
            this.props.setDistantState({ resultOrder: newOrder });
        }
        else if (this.props.order.columnId !== columnId) {
            newOrder = {
                columnId: columnId,
                by: indexName,
                asc: true
            }
            this.props.setDistantState({ resultOrder: newOrder });
        }
        this.props.getResults(newOrder);
    }

    handleToggleAll = () => {
        if (this.props.selectedResultRows.length === this.props.resultList.length) {
            this.props.setDistantState({ selectedResultRows: [] });
        } else {
            this.props.setDistantState({ selectedResultRows: [...Array(this.props.resultList.length).keys()] });
        }
    };

    handleToggle = (value) => {
        const currentIndex = this.props.selectedResultRows.indexOf(value);
        const newChecked = [...this.props.selectedResultRows];

        if (currentIndex === -1) {
            newChecked.push(value);
        } else {
            newChecked.splice(currentIndex, 1);
        }

        this.props.setDistantState({ selectedResultRows: newChecked });
    };

    /* exportResultsDialog:
    * This function opens an electron dialog in order to export selected results.
    */
    exportResultsDialog = () => {
        const type = this.state.selectedExportType.type;
        let exportArray = [this.resultTable[0]];
        exportArray = exportArray.concat(this.props.selectedResultRows.sort().map(index => this.resultTable[index + 1]))
        const path = require('path');
        const dialog = this.props.electron.remote.dialog;
        let filter;
        switch (type) {
            case 'csv':
                filter = {
                    name: 'Comma-separated values',
                    extensions: ['csv']
                };
                break;
            case 'txt':
                filter = {
                    name: 'Text file',
                    extensions: ['txt']
                };
                break;
            case 'json':
                filter = {
                    name: 'JSON file',
                    extensions: ['json']
                };
                break;
        }
        dialog.showSaveDialog(this.props.electron.remote.getCurrentWindow(),
            {
                title: 'Select file to save',
                defaultPath: `${path.join(__dirname, '../data')}`,
                filters: [filter]
            },
            (filePath) => {
                if (filePath !== undefined) {
                    let exportString;
                    switch (type) {
                        case 'csv':
                            exportString = (exportArray.map(exportList => exportList.join(','))).join('\n');
                            break;
                        case 'txt':
                            exportString = (exportArray.map(exportList => exportList.join(' '))).join('\n');
                            break;
                        case 'json':
                            let exportTitles = exportArray[0];
                            let exportData = exportArray.slice(1).map(dataList => {
                                let tempObj = {};
                                dataList.forEach((fieldValue, index) => tempObj[exportTitles[index]] = fieldValue)
                                return tempObj;
                            });
                            exportString = JSON.stringify(exportData);
                            break;
                    }
                    this.props.fs.writeFileSync(filePath, exportString)
                }
            });
    };

    handleMenuToggle = () => {
        this.setState({ open: !this.state.open });
    }

    handleMenuItemClick = typeObj => {
        this.setState({
            open: !this.state.open,
            selectedExportType: typeObj
        });
    };

    handleClose = event => {
        if (this.state.anchorRef.current && this.state.anchorRef.current.contains(event.target)) {
            return;
        }
        this.setState({ open: !this.state.open });
    };

    rowRenderer = ({ key, index, isScrolling, isVisible, style }, wordList) => {
        return (
            <ListItem key={index} classes={{root: this.props.classes.listRow}}style={style} dense>
                <ListItemText primary={index + ' ' + wordList[index]} />
            </ListItem>
        )
    }

    generateWordListElement = wordList => {
        return (
            <Paper key={wordList} classes={{ root: this.props.classes.listBox }}>
                <AutoSizer>
                    {({ height, width }) => (
                        <List
                            width={width}
                            height={height}
                            rowCount={wordList.length}
                            rowHeight={30}
                            rowRenderer={(defaultParams) => this.rowRenderer(defaultParams, wordList)}
                        />
                    )}
                </AutoSizer>
            </Paper>
        );
    }

    getWordList = (bookRow, type) => {
        const filePath = this.props.resultList[bookRow].path;
        const fileName = this.props.resultList[bookRow].name;
        const index = this.props.additionalResults.filter(resultObj => resultObj.wordListType === type).map(resultObj => resultObj.path).indexOf(filePath);
        if (index === -1) {
            const wordList = this.props.ipc.sendSync('get-wordList', {
                filePath: filePath,
                wordListType: type
            })[0].indices[type];
            this.props.setDistantState({
                additionalResults: [...this.props.additionalResults, {
                    path: filePath,
                    name: fileName,
                    wordListType: type,
                    wordList: wordList
                }]
            });
            this.setState({ tabs: [...this.state.tabs, this.generateWordListElement(wordList)] });
        }

        // TODO:: find way to change to correct tab
        return index === -1 ? this.state.tabs.length + 1 : 0;
    }

    showWordList = (event, bookRow, type) => {
        event.stopPropagation();
        this.setState({ tabIndex: this.getWordList(bookRow, type) });
    }

    render() {
        const classes = this.props.classes;
        let tokensColumnId, vocabularyColumnId;
        try {
            for (var i = 0; i <= this.props.resultList.length; i++) {
                this.resultTable.push([]);
            }
        }
        catch (e) { };

        const resultsTab = (
            <Paper className={classes.paper}>
                <Table className={clsx(classes.table)} padding='checkbox'>
                    {(() => {
                        try {
                            let columnId = 0;
                            return (<TableHead>
                                {/* <TableRow>
                                    <TableCell />
                                    {Object.keys(this.state.resultList[0]).map((indexName, i) => {
                                        if (typeof (this.state.resultList[0][indexName]) !== typeof ({}) || Array.isArray(this.state.resultList[0][indexName])) {
                                            return <TableCell key={i} />
                                        }
                                        return <TableCell colSpan={Object.keys(Object.keys(this.state.resultList[0][indexName])).length} key={i}>{indexName}</TableCell>

                                    })}
                                </TableRow> */}
                                <TableRow>
                                    <TableCell>
                                        <Checkbox
                                            onClick={this.handleToggleAll}
                                            checked={this.props.selectedResultRows.length === this.props.resultList.length && this.props.selectedResultRows.length !== 0}
                                            indeterminate={this.props.selectedResultRows.length !== this.props.resultList.length && this.props.selectedResultRows.length !== 0} />
                                    </TableCell>
                                    {Object.keys(this.state.resultList[0]).map((indexName, i) => {
                                        if (typeof (this.state.resultList[0][indexName]) !== typeof ({}) || Array.isArray(this.state.resultList[0][indexName])) {
                                            const id = columnId++;
                                            this.resultTable[0][id] = indexName;
                                            if (indexName === 'tokensNum') {
                                                tokensColumnId = id;
                                            }
                                            else if (indexName === 'vocabularyNum') {
                                                vocabularyColumnId = id;
                                            }
                                            return (<TableCell rowSpan="2" key={i}>
                                                <TableSortLabel
                                                    active={this.props.order.columnId === id}
                                                    direction={this.props.order.asc ? 'asc' : 'desc'}
                                                    onClick={() => this.sortByColumn(`${indexName}`, id)} >
                                                    {indexName}
                                                </TableSortLabel>
                                            </TableCell>)
                                        }
                                        return Object.keys(this.state.resultList[0][indexName]).map((el, idx) => {
                                            const id = columnId++;
                                            this.resultTable[0][id] = el;
                                            return (
                                                <TableCell key={idx}>
                                                    <TableSortLabel
                                                        active={this.props.order.columnId === id}
                                                        direction={this.props.order.asc ? 'asc' : 'desc'}
                                                        onClick={() => this.sortByColumn(`${indexName}.${el}`, id)}
                                                    >
                                                        {el}
                                                    </TableSortLabel>
                                                </TableCell>
                                            )
                                        })
                                    })}
                                </TableRow>
                            </TableHead>
                            )
                        }
                        catch (e) {
                            return (
                                <TableBody>
                                    <TableRow>
                                        <TableCell>No results</TableCell>
                                    </TableRow>
                                </TableBody>
                            )
                        }
                    })()}
                    <TableBody>
                        {(() => {
                            try {
                                return this.state.resultList.map((elem, i) => {
                                    let columnId = 0;
                                    return (<TableRow key={i} onClick={() => this.handleToggle(i)}>
                                        <TableCell>
                                            <Checkbox
                                                checked={this.props.selectedResultRows.indexOf(i) !== -1} />
                                        </TableCell>
                                        {Object.values(elem).map((value, id) => {
                                            if (typeof (value) === typeof ({})) {
                                                return Object.values(value).map((val, idx) => {
                                                    if(val === null) {
                                                        val = 'null'
                                                    }
                                                    const id = columnId++;
                                                    this.resultTable[i + 1][id] = val;
                                                    if (id === tokensColumnId) {
                                                        return (
                                                            <TableCell key={id}>
                                                                <div className={classes.link} onClick={e => this.showWordList(e, i, 'tokens')}>{value}</div>
                                                            </TableCell>
                                                        )
                                                    }
                                                    else if (id === vocabularyColumnId) {
                                                        return (
                                                            <TableCell key={id}>
                                                                <div className={classes.link} onClick={e => this.showWordList(e, i, 'vocabulary')}>{value}</div>
                                                            </TableCell>
                                                        )
                                                    }
                                                    return (
                                                        <TableCell key={idx}>{val}</TableCell>)
                                                })
                                            }
                                            else {
                                                const id = columnId++;
                                                this.resultTable[i + 1][id] = value;
                                                return <TableCell key={id}>{value}</TableCell>
                                            }
                                        })
                                        }
                                    </TableRow>)
                                })
                            }
                            catch (e) {
                                return (
                                    <TableRow>
                                    </TableRow>)
                            }
                        })()}
                    </TableBody>
                </Table>
            </Paper>
        );
        return (
            <div>
                <Button variant="contained" disabled={this.props.processing} className={clsx({ [classes.disabled]: this.props.processing })} onClick={this.props.executeAll}>Execute</Button>
                <Tabs textColor="secondary" value={this.state.tabIndex} variant="scrollable" scrollButtons="auto" onChange={(event, tabIndex) => this.changeTab(tabIndex)}>
                    <Tab label="Results" />
                    {this.props.additionalResults.map((resultObj, index) => (
                        <Tab key={index} label={
                            <div>
                                {`${resultObj.name} ${resultObj.wordListType}`}
                                <IconButton
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        let additionalResults = [...this.props.additionalResults];
                                        additionalResults.splice(index, 1);
                                        this.props.setDistantState({ additionalResults: additionalResults });
                                        let tabs = [...this.state.tabs];
                                        tabs.splice(index, 1);
                                        this.setState({ tabs: tabs, tabIndex: 0 });
                                    }}
                                >
                                    <i className="material-icons">close</i>
                                </IconButton>
                            </div>} />)
                    )}
                </Tabs>
                {this.state.tabIndex === 0 && resultsTab}
                {this.state.tabs.map((component, index) => {
                    if (index + 1 === this.state.tabIndex) {
                        return component;
                    }
                })}
                <ButtonGroup variant="contained" color="primary" className={classes.export} ref={this.state.anchorRef} aria-label="Split button">
                    <Button variant="contained" disabled={this.props.selectedResultRows.length === 0} className={clsx({ [classes.disabled]: this.props.selectedResultRows.length === 0 })} onClick={this.exportResultsDialog}>Export selected as {this.state.selectedExportType.displayName}</Button>
                    <Button
                        color="primary"
                        variant="contained"
                        size="small"
                        onClick={this.handleMenuToggle}
                    >
                        <i className="material-icons">arrow_drop_down</i>
                    </Button>
                </ButtonGroup>
                <Popper open={this.state.open} anchorEl={this.state.anchorRef.current} transition disablePortal>
                    {() => (
                        <Paper>
                            <ClickAwayListener onClickAway={this.handleClose}>
                                <MenuList>
                                    {this.state.exportTypes.map((typeObj, index) => (
                                        <MenuItem
                                            key={index}
                                            selected={typeObj.type === this.state.selectedExportType}
                                            onClick={() => this.handleMenuItemClick(typeObj)}
                                        >
                                            {typeObj.displayName}
                                        </MenuItem>
                                    ))}
                                </MenuList>
                            </ClickAwayListener>
                        </Paper>
                    )}
                </Popper>
            </div >
        );
    };
}
export default withStyles(styles)(ResultsTab);
