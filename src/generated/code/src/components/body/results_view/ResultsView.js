import React, { useEffect, useState } from 'react';
import { Tabs } from 'antd';
import cybertronService from '../../../services/cybertron_service/CybertronService';
import positionTrackingService from '../../../services/position-tracking_service/PositionTrackingService';
import themeService from '../../../services/Theme_service/ThemeService';
import dialogService from '../../../services/dialog_service/DialogService';
import ResultsViewTab from '../results_view/results_view_tab/ResultsViewTab';
import TransformerStatusIcon from './transformer-status_icon/TransformerStatusIcon';
import allSparkService from '../../../services/all-spark_service/AllSparkService';

/**
 * ResultsView component
 * This component is used to display the results generated by the transformers
 */
const ResultsView = () => {
  const [activeKey, setActiveKey] = useState('');
  const [tabs, setTabs] = useState([]);

  /**
   * Initialize the component
   */
  useEffect(() => {
    const loadTransformers = () => {
      try {
        const transformers = cybertronService.transformers;
        const tabs = transformers.map(transformer => ({
          key: transformer.name,
          label: <div style={{display: 'flex'}} ><TransformerStatusIcon transformer={transformer} /> {transformer.name} </div> ,
          children: <ResultsViewTab transformer={transformer} />
        }));
        setTabs(tabs);
        setActiveKey(transformers[0].name);
        positionTrackingService.setActiveTransformer(transformers[0]);
      } catch (error) {
        dialogService.showErrorDialog(error.message);
      }
    };

    loadTransformers();
    allSparkService.eventTarget.addEventListener('transformers-loaded', loadTransformers);

    return () => {
      allSparkService.eventTarget.removeEventListener('transformers-loaded', loadTransformers);
    };
  }, []);

  /**
   * Handle tab change
   * @param {string} key - The key of the selected tab
   */
  const handleTabChange = (key) => {
    try {
      const transformer = cybertronService.transformers.find(t => t.name === key);
      positionTrackingService.setActiveTransformer(transformer);
      setActiveKey(key);
    } catch (error) {
      dialogService.showErrorDialog(error.message);
    }
  };

  return (
    <Tabs
        className={`results-view ${themeService.getCurrentTheme()}`}
        size="small"
        tabBarStyle={{ marginTop: 0 }}
        tabPosition='bottom'
        activeKey={activeKey}
        onChange={handleTabChange}
      >
        {tabs.map(tab => (
          <Tabs.TabPane key={tab.key} tab={tab.label}>
            {tab.children}
          </Tabs.TabPane>
        ))}
      </Tabs>
  );
};

export default ResultsView;