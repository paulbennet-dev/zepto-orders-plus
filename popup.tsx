/// <reference types="chrome" />

import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TableChartIcon from '@mui/icons-material/TableChart';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Select from '@mui/material/Select';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import '@fullcalendar/common/main.css';
import dayGridPlugin from '@fullcalendar/daygrid';
import FullCalendar from '@fullcalendar/react';

import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles.css';

// Update the Product interface to include imageUrl
interface Product {
  name: string;
  count: number;
  imageUrl: string;
  orderDates: string[];
}

// Define the EventProduct type
interface EventProduct {
  name: string;
  imageUrl: string;
  count: number;
}

const theme = createTheme({
  typography: {
    fontFamily: '"Open Sans", sans-serif',
  },
});

const App = () => {
  const [summary, setSummary] = useState<Product[] | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [summaryMonthYear, setSummaryMonthYear] = useState<{
    month: number;
    year: number;
  } | null>(null);
  const [openImage, setOpenImage] = useState<string | null>(null);
  const [isSupportedDomain, setIsSupportedDomain] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [isFetching, setIsFetching] = useState(false); // State to track fetching progress
  const [selectedProduct, setSelectedProduct] = useState<EventProduct | null>(
    null
  ); // State to track the selected product
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const fetchSummary = () => {
    setSummary(null); // Clear old data before fetching new data
    setIsFetching(true); // Disable month selection
    setSortConfig(null); // Reset sorting state
    setViewMode('table'); // Revert to table view on data fetch
    chrome.runtime.sendMessage(
      { action: 'fetchSummary', month: selectedMonth },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError.message);
          toast.error(
            'An error occurred while fetching the summary. Please try again.'
          );
          setSummary(null);
          setSummaryMonthYear(null);
        } else if (response && response.success && response.data) {
          const sortedData = [...response.data].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          setSummary(sortedData);
          setSortConfig({ key: 'name', direction: 'asc' }); // Set default sorting state

          const currentYear = new Date().getFullYear();
          const summaryYear =
            selectedMonth > new Date().getMonth()
              ? currentYear - 1
              : currentYear;
          setSummaryMonthYear({ month: selectedMonth, year: summaryYear });
        } else {
          console.error(
            'Error fetching summary:',
            response?.error || 'Unknown error'
          );
          toast.error(
            response?.error || 'Failed to fetch the summary. Please try again.'
          );
          setSummary(null);
          setSummaryMonthYear(null);
        }

        setIsFetching(false); // Re-enable month selection
      }
    );
  };

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url || '');

      const isSupported = url.hostname.endsWith('zeptonow.com');
      setIsSupportedDomain(isSupported);

      if (isSupported) {
        chrome.runtime.sendMessage({ action: 'isUserLoggedIn' }, (response) => {
          if (response && response.loggedIn) {
            setLoginRequired(false);
          } else {
            setLoginRequired(true);
          }
        });
      }
    });
  }, []);

  useEffect(() => {
    // Fetch summary for the current month on initial load
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchSummary(); // Trigger fetch whenever selectedMonth changes
  }, [selectedMonth]);

  if (!isSupportedDomain) {
    return (
      <ThemeProvider theme={theme}>
        <Container maxWidth={false} style={{ padding: 0 }}>
          <CssBaseline />
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            height="100vh"
          >
            <Typography variant="h6" gutterBottom>
              This extension only works on zeptonow.com.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() =>
                window.open(
                  'https://zepto-prod.onelink.me/tC90/f5j9mzri',
                  '_blank'
                )
              }
            >
              Open ZeptoNow
            </Button>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  if (loginRequired) {
    return (
      <ThemeProvider theme={theme}>
        <Container maxWidth={false} style={{ padding: 0 }}>
          <CssBaseline />
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            height="100vh"
          >
            <Typography variant="h6" gutterBottom>
              Please log in to your ZeptoNow account to use this extension.
            </Typography>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
  };

  const renderSortableHeader = (
    label: string,
    key: keyof Product,
    style?: React.CSSProperties
  ) => (
    <TableCell
      onClick={() => handleSort(key)}
      style={{ cursor: 'pointer', fontWeight: 'bold', ...style }}
    >
      {label}{' '}
      {sortConfig?.key === key && (sortConfig.direction === 'asc' ? '▲' : '▼')}
    </TableCell>
  );

  const handleSort = (key: keyof Product) => {
    const newSortConfig: { key: keyof Product; direction: 'asc' | 'desc' } =
      sortConfig?.key === key
        ? { key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' };

    setSortConfig(newSortConfig);

    if (summary) {
      const sortedData = [...summary].sort((a, b) => {
        if (key === 'count') {
          // Numeric comparison for count
          return newSortConfig.direction === 'asc'
            ? a[key] - b[key]
            : b[key] - a[key];
        } else {
          // String comparison for other keys
          if (a[key] < b[key])
            return newSortConfig.direction === 'asc' ? -1 : 1;
          if (a[key] > b[key])
            return newSortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
      });
      setSummary(sortedData);
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setOpenImage(imageUrl);
  };

  const handleCloseImage = () => {
    setOpenImage(null);
  };

  const handleChipClick = (
    event: React.MouseEvent<HTMLElement>,
    product: EventProduct
  ) => {
    setSelectedProduct(product);
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setSelectedProduct(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'product-popover' : undefined;

  const renderCalendarView = () => {
    const productsByDate: Record<string, Record<string, EventProduct>> = {};

    summary?.forEach((product) => {
      product.orderDates.forEach((orderDate) => {
        const dateKey = new Date(orderDate).toISOString().split('T')[0];

        productsByDate[dateKey] = productsByDate[dateKey] || {};

        productsByDate[dateKey][product.name] = {
          name: product.name,
          imageUrl: product.imageUrl,
          count: 1,
        };
      });
    });

    return (
      <Box marginTop={2}>
        <FullCalendar
          key={selectedMonth}
          plugins={[dayGridPlugin]} // Removed navigation options
          initialView="dayGridMonth"
          events={[]}
          height="auto"
          initialDate={
            new Date(
              summaryMonthYear?.year || new Date().getFullYear(),
              summaryMonthYear?.month || new Date().getMonth(),
              1
            )
          }
          headerToolbar={false} // Disable navigation options
          dayCellContent={(arg) => {
            const dateKey = format(arg.date, 'yyyy-MM-dd');

            const products = productsByDate?.[dateKey] || [];
            return (
              <div style={{ textAlign: 'right' }}>
                <div>{arg.dayNumberText}</div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  {Object.keys(products)
                    .sort()
                    .map((productName, index: number) => {
                      const product = products[productName];

                      return (
                        <Tooltip
                          key={index}
                          title={product.name}
                          placement="auto"
                          arrow
                        >
                          <Chip
                            key={index}
                            avatar={
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  margin: 0,
                                  padding: 0,
                                }}
                              />
                            }
                            style={{
                              margin: '2px',
                              fontSize: '0.75rem',
                              height: '20px',
                              width: '20px',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              borderRadius: '5px',
                              border: 'solid 1px #ccc',
                            }}
                            sx={{
                              '& .MuiChip-label': {
                                display: 'none', // Hide the label
                              },
                            }}
                            onClick={(event) => handleChipClick(event, product)}
                          />
                        </Tooltip>
                      );
                    })}
                </div>
              </div>
            );
          }}
        />
      </Box>
    );
  };

  const renderTableBody = () => {
    if (!summary || summary.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell
              colSpan={4}
              style={{ textAlign: 'center', padding: '16px' }}
            >
              No orders to display for the selected month.
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {summary.map((product, index) => {
          const uniqueSortedDates = Array.from(
            new Set(product.orderDates.map((date) => new Date(date).getDate()))
          )
            .sort((a, b) => a - b)
            .join(', ');
          return (
            <TableRow key={product.name} className="table-row">
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  <div>
                    <img
                      className="product-image"
                      src={product.imageUrl}
                      alt={product.name}
                      style={{
                        width: '30px',
                        marginRight: '8px',
                        verticalAlign: 'middle',
                        borderRadius: '5px',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleImageClick(product.imageUrl)}
                    />
                  </div>
                  <div
                    style={{
                      maxWidth: '150px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      position: 'relative',
                    }}
                  >
                    <Tooltip title={product.name} placement="top">
                      <span>{product.name}</span>
                    </Tooltip>
                  </div>
                  <div
                    className="copy-icon"
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      padding: '4px',
                    }}
                  >
                    <Tooltip title="Copy to clipboard" placement="top">
                      <Button
                        onClick={() =>
                          navigator.clipboard.writeText(product.name)
                        }
                        style={{ minWidth: 'auto', padding: '4px' }}
                      >
                        <ContentCopyIcon />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </TableCell>
              <TableCell style={{ textAlign: 'right' }}>
                {product.count}
              </TableCell>
              <TableCell style={{ textAlign: 'right' }}>
                {uniqueSortedDates.split(', ').map((date, idx) => (
                  <Tooltip
                    key={idx}
                    title={new Date(product.orderDates[idx]).toLocaleString(
                      'default',
                      {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                    placement="top"
                  >
                    <Chip
                      label={date}
                      style={{
                        margin: '2px',
                        fontSize: '0.75rem',
                        height: '20px',
                        lineHeight: '20px',
                      }}
                    />
                  </Tooltip>
                ))}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    );
  };

  const renderSectionHeader = () => (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      style={{ marginBottom: '8px' }}
      width={'100%'}
      padding={1}
    >
      <Typography variant="h6">
        Summary for{' '}
        {new Date(
          summaryMonthYear?.year || new Date().getFullYear(),
          summaryMonthYear?.month || new Date().getMonth()
        ).toLocaleString('default', { month: 'long' })}
        , {summaryMonthYear?.year || new Date().getFullYear()}
      </Typography>
      <Box
        display="flex"
        alignSelf="flex-end"
        justifyContent="flex-end"
        alignItems="center"
      >
        <ButtonGroup
          variant="contained"
          color="primary"
          style={{ marginRight: '8px' }}
        >
          <Tooltip title="Table View" placement="top">
            <Button
              style={{
                backgroundColor: viewMode === 'table' ? '#ff4081' : '#5c6bc0',
                color: 'white',
              }}
              onClick={() => setViewMode('table')}
            >
              <TableChartIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Calendar View" placement="top">
            <Button
              style={{
                backgroundColor:
                  viewMode === 'calendar' ? '#ff4081' : '#5c6bc0',
                color: 'white',
              }}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarTodayIcon />
            </Button>
          </Tooltip>
        </ButtonGroup>
      </Box>
    </Box>
  );

  const renderFooter = () => (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      padding={2}
      style={{ marginTop: '16px' }}
    >
      <Tooltip title="Support me on GitHub Sponsors" placement="top">
        <IconButton
          onClick={() =>
            window.open('https://github.com/sponsors/paulbennet-dev', '_blank')
          }
          style={{ marginRight: '8px' }}
        >
          <img
            src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
            alt="GitHub Sponsors"
            style={{ width: '24px', height: '24px' }}
          />
        </IconButton>
      </Tooltip>
      <Tooltip title="Sign up on Zepto using my referral link" placement="top">
        <IconButton
          onClick={() =>
            window.open('https://zepto-prod.onelink.me/tC90/f5j9mzri', '_blank')
          }
        >
          <img
            src="icon.png"
            alt="Zepto Referral"
            style={{ width: '24px', height: '24px' }}
          />
        </IconButton>
      </Tooltip>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth={false} style={{ padding: 0 }}>
        <CssBaseline />
        <ToastContainer
          position="bottom-center"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        <AppBar
          position="sticky"
          style={{ width: '100%', backgroundColor: '#3f51b5' }}
        >
          <Toolbar>
            <Typography
              variant="h6"
              style={{
                fontSize: '1rem',
                flexGrow: 1,
                fontWeight: 'bold',
                margin: '0 16px',
              }}
            >
              Zepto (Unofficial) Orders Plus
            </Typography>
            <Select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              disabled={isFetching} // Disable selection during fetching
              color="secondary"
              style={{
                fontSize: '0.85rem',
                color: 'white',
                fontWeight: 'bold',
              }}
              SelectDisplayProps={{
                style: {
                  padding: '8px 32px 8px 16px',
                },
              }}
            >
              <MenuItem value={new Date().getMonth()}>
                Current Month (
                {new Date().toLocaleString('default', { month: 'long' })},{' '}
                {new Date().getFullYear()})
              </MenuItem>
              <MenuItem value={new Date().getMonth() - 1}>
                Previous Month (
                {new Date(
                  new Date().setMonth(new Date().getMonth() - 1)
                ).toLocaleString('default', { month: 'long' })}
                , {new Date().getFullYear()})
              </MenuItem>
            </Select>
          </Toolbar>
        </AppBar>
        <Grid container spacing={3} style={{ marginTop: '16px' }}>
          <Grid>
            {summary && (
              <Grid container marginX={1}>
                {renderSectionHeader()}
                {viewMode === 'table' ? (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 1,
                          backgroundColor: 'white',
                        }}
                      >
                        <TableRow>
                          <TableCell>#</TableCell>
                          {renderSortableHeader('Product', 'name')}
                          {renderSortableHeader('Count', 'count', {
                            textAlign: 'right',
                          })}
                          <TableCell style={{ textAlign: 'right' }}>
                            Ordered on Dates
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      {renderTableBody()}
                    </Table>
                  </TableContainer>
                ) : (
                  renderCalendarView()
                )}
              </Grid>
            )}
          </Grid>
        </Grid>
        <Dialog
          open={!!openImage}
          onClose={handleCloseImage}
          maxWidth="lg"
          fullWidth
        >
          <DialogContent style={{ position: 'relative', padding: 0 }}>
            <IconButton
              onClick={handleCloseImage}
              style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
            >
              <CloseIcon />
            </IconButton>
            {openImage && (
              <img
                src={openImage}
                alt="Product"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            )}
          </DialogContent>
        </Dialog>
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClosePopover}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          {selectedProduct && (
            <Box padding={2} textAlign="center">
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                style={{ width: '100px', height: '100px', borderRadius: '8px' }}
              />
              <Typography variant="h6" style={{ marginTop: '8px' }}>
                {selectedProduct.name}
              </Typography>
            </Box>
          )}
        </Popover>
        {renderFooter()}
      </Container>
    </ThemeProvider>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
