import React, { Component } from 'react';
import { Tooltip, Button, Divider } from 'antd';
import { BuildOutlined, PlayCircleOutlined, CodeOutlined, BugOutlined, StepForwardOutlined } from '@ant-design/icons';
import buildService from '../../../../services/build_service/BuildService';
import projectService from '../../../../services/project_service/ProjectService';
import positionTrackingService from '../../../../services/position-tracking_service/PositionTrackingService';
import themeService from '../../../../services/Theme_service/ThemeService';
import dialogService from '../../../../services/dialog_service/DialogService';

/**
 * BuildSection component
 */
class BuildSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      allDisabled: true,
      fragmentDisabled: true,
      transformerDisabled: true,
      debugDisabled: false,
      nextDisabled: true,
    };
  }

  componentDidMount() {
    this.updateButtonStates();
    projectService.eventTarget.addEventListener('fragment-out-of-date', this.updateButtonStates);
    positionTrackingService.eventTarget.addEventListener('change', this.updateButtonStates);
    buildService.eventTarget.addEventListener('is-building', this.updateButtonStates);
  }

  componentWillUnmount() {
    projectService.eventTarget.removeEventListener('fragment-out-of-date', this.updateButtonStates);
    positionTrackingService.eventTarget.removeEventListener('change', this.updateButtonStates);
    buildService.eventTarget.removeEventListener('is-building', this.updateButtonStates);
  }

  updateButtonStates = () => {
    this.setState({
      allDisabled: !projectService.isAnyFragmentOutOfDate() || buildService.isBuilding,
      fragmentDisabled: !positionTrackingService.activeFragment?.isOutOfDate || buildService.isBuilding,
      transformerDisabled: !positionTrackingService.activeFragment || !positionTrackingService.activeTransformer || buildService.isBuilding,
      nextDisabled: !buildService.debug && !buildService.isBuilding,
    });
  }

  handleAllClick = () => {
    try {
      buildService.buildAll();
    } catch (error) {
      dialogService.showErrorDialog(error.message);
    }
  }

  handleFragmentClick = () => {
    try {
      buildService.buildFragment(positionTrackingService.activeFragment);
    } catch (error) {
      dialogService.showErrorDialog(error.message);
    }
  }

  handleTransformerClick = () => {
    try {
      buildService.runTransformer(positionTrackingService.activeFragment, positionTrackingService.activeTransformer);
    } catch (error) {
      dialogService.showErrorDialog(error.message);
    }
  }

  handleDebugClick = () => {
    buildService.debug = !buildService.debug;
    this.setState({ nextDisabled: !buildService.debug && !buildService.isBuilding });
  }

  handleNextClick = () => {
    try {
      buildService.runNext();
    } catch (error) {
      dialogService.showErrorDialog(error.message);
    }
  }

  render() {
    const theme = themeService.getCurrentTheme();
    return (
      <div className={`build-section ${theme}`}>
        <Tooltip title="Start rendering the currently selected entry point for the entire project">
          <Button icon={<BuildOutlined />} onClick={this.handleAllClick} disabled={this.state.allDisabled} />
        </Tooltip>
        <Tooltip title="Start rendering the currently selected entry point for the currently active fragment">
          <Button icon={<CodeOutlined />} onClick={this.handleFragmentClick} disabled={this.state.fragmentDisabled} />
        </Tooltip>
        <Tooltip title="Start rendering the result for the currently active fragment and transformer">
          <Button icon={<PlayCircleOutlined />} onClick={this.handleTransformerClick} disabled={this.state.transformerDisabled} />
        </Tooltip>
        <Divider type="vertical" style={{ height: '24px' }} />
        <Tooltip title="Toggle debug mode">
          <Button icon={<BugOutlined />} onClick={this.handleDebugClick} disabled={this.state.debugDisabled} />
        </Tooltip>
        <Tooltip title="Continue rendering to the next transformer">
          <Button icon={<StepForwardOutlined />} onClick={this.handleNextClick} disabled={this.state.nextDisabled} />
        </Tooltip>
      </div>
    );
  }
}

export default BuildSection;